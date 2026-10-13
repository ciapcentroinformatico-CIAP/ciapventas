/**
 * CIAP Informática - Servidor
 * Sirve la tienda (carpeta public/) y la API que lee y guarda en MongoDB.
 */
'use strict';

// En tu computadora las variables se leen del archivo .env (en Render se definen en el panel)
try { process.loadEnvFile(); } catch (e) { /* sin archivo .env */ }

const path = require('path');
const express = require('express');
const datos = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Render está detrás de un proxy: así req.ip es la del visitante
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    next();
});

/* ---------- Límite de envíos: 8 por minuto por IP ---------- */

const envios = new Map();
const LIMITE = 8;
const VENTANA_MS = 60 * 1000;

function limitar(req, res, next) {
    const ahora = Date.now();
    const recientes = (envios.get(req.ip) || []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= LIMITE) {
        return res.status(429).json({ ok: false, error: 'Demasiados envíos. Espera un minuto e intenta de nuevo.' });
    }
    recientes.push(ahora);
    envios.set(req.ip, recientes);
    next();
}
setInterval(() => {
    const ahora = Date.now();
    for (const [ip, tiempos] of envios) if (tiempos.every((t) => ahora - t >= VENTANA_MS)) envios.delete(ip);
}, VENTANA_MS).unref();

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/* ---------- API ---------- */

// Render consulta esta ruta para saber si el servicio está vivo
app.get('/healthz', (req, res) => res.json({ ok: true, db: datos.estado() }));

app.get('/api/tienda', async (req, res, next) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json(await datos.tienda());
    } catch (err) { next(err); }
});

app.post('/api/mensajes', limitar, async (req, res, next) => {
    try {
        const b = req.body || {};
        // Campo trampa anti-spam: los bots suelen llenarlo
        if (b.website) return res.json({ ok: true });
        const msg = {
            nombre: texto(b.nombre, 100),
            telefono: texto(b.telefono, 30),
            asunto: texto(b.asunto, 150),
            mensaje: texto(b.mensaje, 1500),
        };
        if (!msg.nombre || !msg.mensaje) return res.status(422).json({ ok: false, error: 'Completa tu nombre y el mensaje.' });
        const guardado = await datos.guardarMensaje(msg);
        if (!guardado) return res.status(503).json({ ok: false, error: 'La base de datos no está disponible.' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

app.post('/api/pedidos', limitar, async (req, res, next) => {
    try {
        const items = Array.isArray(req.body && req.body.items) ? req.body.items.slice(0, 100) : [];
        const pedido = await datos.crearPedido(items);
        if (!pedido) return res.status(503).json({ ok: false, error: 'La base de datos no está disponible.' });
        res.json({ ok: true, ...pedido });
    } catch (err) {
        if (err instanceof datos.PedidoError) return res.status(422).json({ ok: false, error: err.message });
        next(err);
    }
});

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

/* ---------- Tienda ---------- */

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
        return res.status(400).json({ ok: false, error: 'Solicitud no válida.' });
    }
    console.error('[servidor]', err);
    res.status(500).json({ ok: false, error: 'Error del servidor. Intenta de nuevo en unos minutos.' });
});

app.listen(PORT, () => {
    console.log(`CIAP Informática en http://localhost:${PORT}`);
    if (datos.estado() === 'sin configurar') {
        console.warn('[db] Falta MONGODB_URI: se muestran los datos iniciales y no se guardan mensajes ni pedidos.');
    }
    // Conecta al arrancar para que el primer visitante no espere
    datos.db();
});
