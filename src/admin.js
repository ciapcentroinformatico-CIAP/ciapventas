/**
 * CIAP Informática - API del panel de administración (/api/admin)
 * Todo lo que llega del panel se limpia aquí antes de guardarse en la base.
 */
'use strict';

const crypto = require('crypto');
const express = require('express');
const { Binary, ObjectId } = require('mongodb');
const datos = require('./db');
const auth = require('./auth');
const seed = require('./seed');

const router = express.Router();
const SIN_ID = { projection: { _id: 0 } };
const ESTADOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'];

/* ---------- Limpieza de datos ---------- */

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const numero = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.max(0, Math.round(Number(v) * 100) / 100) : 0);
const entero = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const lista = (v, maxItems, maxLargo) =>
    (Array.isArray(v) ? v : []).map((x) => texto(x, maxLargo)).filter(Boolean).slice(0, maxItems);

function slug(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
}

// Solo se aceptan imágenes propias (/media/…) o enlaces https
const imagen = (v) => {
    const s = texto(v, 300);
    return /^\/media\/[a-f0-9]{24}$/.test(s) || /^https:\/\/[^\s"'<>]+$/.test(s) ? s : '';
};

/** Campos permitidos de cada colección: lo que no está aquí se descarta */
const LIMPIAR = {
    productos: (b) => ({
        nombre: texto(b.nombre, 150),
        categoria: texto(b.categoria, 80),
        precio: numero(b.precio),
        precioAntes: numero(b.precioAntes) > 0 ? numero(b.precioAntes) : null,
        etiqueta: texto(b.etiqueta, 30),
        destacado: b.destacado === true,
        stock: entero(b.stock),
        descripcion: texto(b.descripcion, 1000),
        specs: lista(b.specs, 8, 80),
        imagen: imagen(b.imagen),
        activo: b.activo !== false,
        orden: entero(b.orden),
    }),
    servicios: (b) => ({
        nombre: texto(b.nombre, 100),
        icono: texto(b.icono, 30) || 'wrench',
        desde: numero(b.desde),
        texto: texto(b.texto, 400),
        incluye: lista(b.incluye, 5, 80),
        activo: b.activo !== false,
        orden: entero(b.orden),
    }),
    categorias: (b) => ({
        nombre: texto(b.nombre, 60),
        icono: texto(b.icono, 30) || 'cpu',
        activo: b.activo !== false,
        orden: entero(b.orden),
    }),
};

// Campo que identifica cada documento en la URL
const CLAVE = { productos: 'id', servicios: 'id', categorias: 'slug' };
const filtro = (tipo, id) => ({ [CLAVE[tipo]]: tipo === 'productos' ? Number(id) : String(id) });

const objetos = (v, campos, maxItems) =>
    (Array.isArray(v) ? v : []).slice(0, maxItems)
        .map((o) => Object.fromEntries(campos.map(([k, max]) => [k, texto(o && o[k], max)])))
        .filter((o) => Object.values(o).some(Boolean));

function limpiarConfiguracion(b) {
    const g = (grupo) => (b && typeof b[grupo] === 'object' && b[grupo]) || {};
    return {
        marca: { nombre: texto(g('marca').nombre, 40) || seed.marca.nombre, subtitulo: texto(g('marca').subtitulo, 40) },
        contacto: {
            whatsapp: texto(g('contacto').whatsapp, 20).replace(/\D/g, ''),
            telefono: texto(g('contacto').telefono, 40),
            email: texto(g('contacto').email, 120),
            direccion: texto(g('contacto').direccion, 200),
            horario: texto(g('contacto').horario, 100),
        },
        moneda: texto(b.moneda, 6) || seed.moneda,
        portada: {
            etiqueta: texto(g('portada').etiqueta, 80),
            titulo: texto(g('portada').titulo, 60),
            resaltado: texto(g('portada').resaltado, 60),
            texto: texto(g('portada').texto, 400),
        },
        nosotros: { titulo: texto(g('nosotros').titulo, 120), texto: texto(g('nosotros').texto, 1500) },
        estadisticas: objetos(b.estadisticas, [['numero', 12], ['texto', 40]], 4),
        beneficios: objetos(b.beneficios, [['icono', 30], ['titulo', 40], ['texto', 80]], 4),
        valores: objetos(b.valores, [['icono', 30], ['titulo', 60], ['texto', 240]], 4),
    };
}

/* ---------- Sesión ---------- */

router.use(auth.mismoOrigen);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/sesion', (req, res) => res.json({ ok: true, activo: auth.configurado(), sesion: auth.haySesion(req) }));
router.post('/login', auth.login);
router.post('/logout', auth.logout);

// De aquí en adelante todo requiere sesión y base de datos
router.use(auth.requiereSesion);
router.use(async (req, res, next) => {
    try {
        req.base = await datos.db();
        if (!req.base) return res.status(503).json({ ok: false, error: 'La base de datos no está disponible. Revisa MONGODB_URI.' });
        next();
    } catch (err) { next(err); }
});

// Envuelve las rutas asíncronas: los errores van al manejador general
const ruta = (fn) => (req, res, next) => fn(req, res).catch((err) => {
    if (err && err.code === 11000) return res.status(409).json({ ok: false, error: 'Ya existe un registro con ese nombre.' });
    next(err);
});

/* ---------- Lectura ---------- */

router.get('/datos', ruta(async (req, res) => {
    const b = req.base;
    const todos = (nombre) => b.collection(nombre).find({}, SIN_ID).sort({ orden: 1, id: 1 }).toArray();
    const [config, categorias, productos, servicios, pedidos, mensajes] = await Promise.all([
        b.collection('configuracion').findOne({ _id: 'tienda' }, SIN_ID),
        todos('categorias'),
        todos('productos'),
        todos('servicios'),
        b.collection('pedidos').find({}, SIN_ID).sort({ fecha: -1 }).limit(300).toArray(),
        b.collection('mensajes').find({}).sort({ fecha: -1 }).limit(300).toArray(),
    ]);
    const configuracion = {};
    for (const k of datos.CONFIG_KEYS) configuracion[k] = (config && config[k]) ?? seed[k];
    res.json({
        ok: true, configuracion, categorias, productos, servicios, pedidos,
        mensajes: mensajes.map(({ _id, ...m }) => ({ id: String(_id), ...m })),
    });
}));

/* ---------- Productos, servicios y categorías ---------- */

const TIPOS = ':tipo(productos|servicios|categorias)';

async function validar(base, tipo, doc) {
    if (!doc.nombre) return 'Escribe el nombre.';
    if (tipo === 'productos') {
        if (!(doc.precio > 0)) return 'Escribe un precio mayor que cero.';
        if (!await base.collection('categorias').findOne({ slug: doc.categoria })) return 'Elige una categoría.';
    }
    return '';
}

router.post(`/${TIPOS}`, ruta(async (req, res) => {
    const { tipo } = req.params;
    const coll = req.base.collection(tipo);
    const doc = LIMPIAR[tipo](req.body || {});
    const error = await validar(req.base, tipo, doc);
    if (error) return res.status(422).json({ ok: false, error });

    if (tipo === 'productos') {
        const ultimo = await coll.find({}, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).next();
        doc.id = (ultimo ? Number(ultimo.id) || 0 : 0) + 1;
    } else {
        // El identificador sale del nombre; si ya existe se le añade un número
        const clave = CLAVE[tipo];
        const base = slug(doc.nombre);
        let valor = base;
        for (let n = 2; await coll.findOne({ [clave]: valor }); n++) valor = `${base}-${n}`;
        doc[clave] = valor;
    }
    if (!doc.orden) doc.orden = await coll.countDocuments() + 1;
    await coll.insertOne(doc);
    datos.limpiarCache();
    res.json({ ok: true });
}));

router.put(`/${TIPOS}/:id`, ruta(async (req, res) => {
    const { tipo, id } = req.params;
    const doc = LIMPIAR[tipo](req.body || {});
    const error = await validar(req.base, tipo, doc);
    if (error) return res.status(422).json({ ok: false, error });
    const r = await req.base.collection(tipo).updateOne(filtro(tipo, id), { $set: doc });
    if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'El registro ya no existe.' });
    datos.limpiarCache();
    res.json({ ok: true });
}));

router.delete(`/${TIPOS}/:id`, ruta(async (req, res) => {
    const { tipo, id } = req.params;
    if (tipo === 'categorias') {
        const usados = await req.base.collection('productos').countDocuments({ categoria: String(id) });
        if (usados) {
            return res.status(409).json({ ok: false, error: `Esta categoría tiene ${usados} productos. Muévelos a otra u ocúltala.` });
        }
    }
    await req.base.collection(tipo).deleteOne(filtro(tipo, id));
    datos.limpiarCache();
    res.json({ ok: true });
}));

/* ---------- Configuración de la tienda ---------- */

router.put('/configuracion', ruta(async (req, res) => {
    const config = limpiarConfiguracion(req.body || {});
    await req.base.collection('configuracion').updateOne({ _id: 'tienda' }, { $set: config }, { upsert: true });
    datos.limpiarCache();
    res.json({ ok: true });
}));

/* ---------- Pedidos y mensajes ---------- */

router.patch('/pedidos/:folio', ruta(async (req, res) => {
    const estado = String((req.body || {}).estado);
    if (!ESTADOS.includes(estado)) return res.status(422).json({ ok: false, error: 'Estado no válido.' });
    await req.base.collection('pedidos').updateOne({ folio: String(req.params.folio) }, { $set: { estado } });
    res.json({ ok: true });
}));

router.delete('/pedidos/:folio', ruta(async (req, res) => {
    await req.base.collection('pedidos').deleteOne({ folio: String(req.params.folio) });
    res.json({ ok: true });
}));

const idMensaje = (req, res) => {
    if (ObjectId.isValid(req.params.id)) return new ObjectId(req.params.id);
    res.status(404).json({ ok: false, error: 'El mensaje ya no existe.' });
    return null;
};

router.patch('/mensajes/:id', ruta(async (req, res) => {
    const _id = idMensaje(req, res);
    if (!_id) return;
    await req.base.collection('mensajes').updateOne({ _id }, { $set: { leido: (req.body || {}).leido === true } });
    res.json({ ok: true });
}));

router.delete('/mensajes/:id', ruta(async (req, res) => {
    const _id = idMensaje(req, res);
    if (!_id) return;
    await req.base.collection('mensajes').deleteOne({ _id });
    res.json({ ok: true });
}));

/* ---------- Imágenes ---------- */

// Las fotos se guardan en la base (colección "archivos"): Render borra el disco en cada despliegue
const FIRMAS = [
    ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
    ['image/png', (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
    ['image/webp', (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'],
];

router.post('/imagenes', express.raw({ type: FIRMAS.map((f) => f[0]), limit: '2mb' }), ruta(async (req, res) => {
    const bytes = req.body;
    // Se comprueba el contenido real del archivo, no lo que dice el navegador
    const firma = Buffer.isBuffer(bytes) && bytes.length > 12 ? FIRMAS.find((f) => f[1](bytes)) : null;
    if (!firma) return res.status(422).json({ ok: false, error: 'Formato no permitido. Usa JPG, PNG o WEBP.' });
    const _id = crypto.randomBytes(12).toString('hex');
    await req.base.collection('archivos').insertOne({ _id, tipo: firma[0], tamano: bytes.length, datos: new Binary(bytes), fecha: new Date() });
    res.json({ ok: true, url: `/media/${_id}` });
}));

/** Sirve una imagen guardada en la base (ruta pública /media/:id) */
async function media(req, res, next) {
    try {
        if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.status(404).end();
        const base = await datos.db();
        const doc = base && await base.collection('archivos').findOne({ _id: req.params.id });
        if (!doc) return res.status(404).end();
        res.set({ 'Content-Type': doc.tipo, 'Cache-Control': 'public, max-age=31536000, immutable' });
        res.end(doc.datos.buffer);
    } catch (err) { next(err); }
}

module.exports = { router, media };
