/**
 * CIAP Informática - Base de datos (MongoDB Atlas)
 *
 * La cadena de conexión se toma de la variable de entorno MONGODB_URI.
 * La primera vez se crean los índices y se cargan los datos iniciales de seed.js.
 * Si no hay conexión, la tienda se muestra con los datos iniciales y no guarda nada.
 */
'use strict';

const { MongoClient } = require('mongodb');
const seed = require('./seed');

const URI = (process.env.MONGODB_URI || '').trim();
const DB_NAME = (process.env.MONGODB_DB || 'ciap').trim();
const REINTENTO_MS = 30 * 1000;
const CACHE_MS = 60 * 1000;

// Secciones que viven en un solo documento de la colección "configuracion"
const CONFIG_KEYS = ['marca', 'contacto', 'moneda', 'portada', 'nosotros', 'estadisticas', 'beneficios', 'valores'];
const SIN_ID = { projection: { _id: 0 } };

let conexion = null;       // promesa de la base de datos (o null si falló)
let ultimoFallo = 0;
let estado = URI ? 'conectando' : 'sin configurar';
let cache = { datos: null, hasta: 0 };

/* ---------- Conexión ---------- */

/** Devuelve la base de datos, o null si no está configurada o no responde */
async function db() {
    if (!URI) return null;
    if (!conexion) {
        if (Date.now() - ultimoFallo < REINTENTO_MS) return null;
        conexion = conectar().catch((err) => {
            console.error('[db] No se pudo conectar con MongoDB:', err.message);
            estado = 'error';
            ultimoFallo = Date.now();
            conexion = null;
            return null;
        });
    }
    return conexion;
}

async function conectar() {
    const client = new MongoClient(URI, { appName: 'CIAP', serverSelectionTimeoutMS: 8000 });
    try {
        await client.connect();
        const base = client.db(DB_NAME);
        await inicializar(base);
        estado = 'conectada';
        console.log(`[db] Conectado a MongoDB, base "${DB_NAME}"`);
        return base;
    } catch (err) {
        await client.close().catch(() => {});
        throw err;
    }
}

/** Crea índices únicos y carga los datos iniciales en las colecciones vacías */
async function inicializar(base) {
    await Promise.all([
        base.collection('productos').createIndex({ id: 1 }, { unique: true }),
        base.collection('categorias').createIndex({ slug: 1 }, { unique: true }),
        base.collection('servicios').createIndex({ id: 1 }, { unique: true }),
        base.collection('pedidos').createIndex({ folio: 1 }, { unique: true }),
    ]);

    const config = Object.fromEntries(CONFIG_KEYS.map((k) => [k, seed[k]]));
    await base.collection('configuracion').updateOne({ _id: 'tienda' }, { $setOnInsert: config }, { upsert: true });

    for (const nombre of ['categorias', 'productos', 'servicios']) {
        const coll = base.collection(nombre);
        if (await coll.estimatedDocumentCount() > 0) continue;
        await coll.insertMany(seed[nombre].map((doc, i) => ({ ...doc, activo: true, orden: i + 1 })));
    }
}

/* ---------- Lectura ---------- */

const visibles = (base, nombre) =>
    base.collection(nombre).find({ activo: { $ne: false } }, SIN_ID).sort({ orden: 1, id: 1 }).toArray();

/** Todo lo que necesita la tienda pública. Se guarda un minuto en memoria. */
async function tienda() {
    if (cache.datos && Date.now() < cache.hasta) return cache.datos;

    const base = await db();
    if (!base) return cache.datos || seed;

    let config, categorias, productos, servicios;
    try {
        [config, categorias, productos, servicios] = await Promise.all([
            base.collection('configuracion').findOne({ _id: 'tienda' }, SIN_ID),
            visibles(base, 'categorias'),
            visibles(base, 'productos'),
            visibles(base, 'servicios'),
        ]);
    } catch (err) {
        // Si Atlas deja de responder, la tienda sigue abierta con lo último que se leyó
        console.error('[db] No se pudo leer la tienda:', err.message);
        estado = 'error';
        return cache.datos || seed;
    }
    estado = 'conectada';

    // Los valores iniciales cubren las claves que falten en la base
    const datos = { categorias, productos, servicios };
    for (const k of CONFIG_KEYS) datos[k] = (config && config[k]) ?? seed[k];

    cache = { datos, hasta: Date.now() + CACHE_MS };
    return datos;
}

/* ---------- Escritura ---------- */

/** Guarda un mensaje del formulario de contacto. Devuelve false si no hay base de datos. */
async function guardarMensaje({ nombre, telefono, asunto, mensaje }) {
    const base = await db();
    if (!base) return false;
    await base.collection('mensajes').insertOne({ nombre, telefono, asunto, mensaje, leido: false, fecha: new Date() });
    return true;
}

class PedidoError extends Error {}

/**
 * Registra un pedido. Los precios y el stock se toman siempre de la base, nunca del navegador.
 * items: [{ id, qty }]. Devuelve { folio, total } o null si no hay base de datos.
 */
async function crearPedido(items) {
    const base = await db();
    if (!base) return null;

    const cantidades = new Map();
    for (const it of items) {
        const id = Number(it.id);
        const qty = Math.floor(Number(it.qty));
        if (!Number.isInteger(id) || !(qty >= 1)) continue;
        cantidades.set(id, Math.min(99, (cantidades.get(id) || 0) + qty));
    }
    if (!cantidades.size) throw new PedidoError('Tu carrito está vacío.');

    const productos = await base.collection('productos')
        .find({ id: { $in: [...cantidades.keys()] }, activo: { $ne: false } }, SIN_ID).toArray();
    if (!productos.length) throw new PedidoError('Los productos de tu carrito ya no están disponibles.');

    const lineas = productos.map((p) => {
        const cantidad = cantidades.get(p.id);
        if (Number(p.stock) < cantidad) throw new PedidoError(`Solo quedan ${Math.max(0, Number(p.stock) || 0)} unidades de "${p.nombre}".`);
        return { id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad };
    });
    const total = Math.round(lineas.reduce((t, l) => t + l.precio * l.cantidad, 0) * 100) / 100;

    const hoy = new Date();
    const fecha = hoy.toISOString().slice(2, 10).replace(/-/g, '');
    const folio = `CI-${fecha}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`;
    await base.collection('pedidos').insertOne({ folio, fecha: hoy, estado: 'pendiente', items: lineas, total });
    return { folio, total };
}

/** Después de un cambio desde el panel, la tienda vuelve a leer la base */
function limpiarCache() {
    cache = { datos: null, hasta: 0 };
}

module.exports = { db, tienda, guardarMensaje, crearPedido, limpiarCache, PedidoError, CONFIG_KEYS, estado: () => estado };
