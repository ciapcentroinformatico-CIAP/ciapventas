/**
 * CIAP Informática - Servidor
 * Sirve la tienda (carpeta public/) y la API que lee y guarda en MongoDB.
 */
'use strict';

// En tu computadora las variables se leen del archivo .env (en Render se definen en el panel)
try { process.loadEnvFile(); } catch (e) { /* sin archivo .env */ }

const fs = require('fs');
const path = require('path');
const express = require('express');
const datos = require('./src/db');
const admin = require('./src/admin');

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

app.use('/api/admin', admin.router);
app.get('/media/:id', admin.media);

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

/* ---------- Tienda ---------- */

const PUBLIC = path.join(__dirname, 'public');
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Dirección oficial de la tienda (SITE_URL, p. ej. https://ciapcax.com). Sin ella se usa el dominio por el que se entra.
// Así Google trata ciapcax.com como la dirección principal aunque la tienda también se abra por onrender.com.
const origen = (req) => (process.env.SITE_URL || '').trim().replace(/\/+$/, '')
    || `${req.hostname === 'localhost' ? 'http' : 'https'}://${req.get('host')}`;
const absoluta = (base, ruta) => (/^https?:\/\//.test(ruta) ? ruta : `${base}/${String(ruta).replace(/^\/+/, '')}`);
const MONEDAS = { 'S/': 'PEN', '$': 'USD', 'US$': 'USD', '€': 'EUR' };

// Datos estructurados (schema.org) para Google: la tienda con su contacto, sus servicios y los productos con precio
function datosEstructurados(t, base) {
    const moneda = MONEDAS[String(t.moneda || '').trim()] || 'PEN';
    const tienda = {
        '@type': 'ComputerStore',
        '@id': `${base}/#tienda`,
        name: [t.marca.nombre, t.marca.subtitulo].filter(Boolean).join(' · '),
        description: t.seo.descripcion,
        url: `${base}/`,
        logo: absoluta(base, t.marca.logo || 'assets/img/logo.webp'),
        image: absoluta(base, t.portada.imagen || t.marca.logo || 'assets/img/logo.webp'),
        telephone: t.contacto.telefono || undefined,
        email: t.contacto.email || undefined,
        address: t.contacto.direccion ? { '@type': 'PostalAddress', streetAddress: t.contacto.direccion, addressCountry: 'PE' } : undefined,
        makesOffer: t.servicios.map((s) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.nombre, description: s.texto },
            ...(s.desde ? { price: s.desde, priceCurrency: moneda } : {}),
        })),
    };
    const productos = {
        '@type': 'ItemList',
        name: 'Productos',
        itemListElement: t.productos.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: p.nombre,
                description: p.descripcion || undefined,
                image: p.imagen ? absoluta(base, p.imagen) : undefined,
                category: (t.categorias.find((c) => c.slug === p.categoria) || {}).nombre,
                offers: {
                    '@type': 'Offer',
                    price: p.precio,
                    priceCurrency: moneda,
                    availability: `https://schema.org/${p.stock > 0 ? 'InStock' : 'OutOfStock'}`,
                    seller: { '@id': `${base}/#tienda` },
                },
            },
        })),
    };
    // "<" escapado para que ningún texto del panel pueda cerrar la etiqueta <script>
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': [tienda, productos] }).replace(/</g, '\\u003c');
}

// Contenido de la tienda ya escrito en el HTML: sin esto Google ve la página vacía y la marca como "Soft 404".
// app.js reemplaza cada bloque con su versión interactiva al cargar.
function contenidoInicial(html, t) {
    const dinero = (n) => `${escHtml(t.moneda)} ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const parrafos = String(t.nosotros.texto || '').split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${escHtml(p.trim())}</p>`).join('');
    const llenar = (id, contenido) => (h) => h.replace(new RegExp(`(<[^>]+id="${id}"[^>]*>)(</)`), (m, a, b) => a + contenido + b);
    const pasos = [
        llenar('feature', `<div class="slide"><h1>${escHtml(t.portada.titulo)} ${escHtml(t.portada.resaltado)}</h1><p>${escHtml(t.portada.texto)}</p></div>`),
        llenar('catTiles', t.categorias.map((c) => `<a href="#productos">${escHtml(c.nombre)}</a>`).join(' ')),
        llenar('productGrid', t.productos.map((p) => `<article class="card"><h3>${escHtml(p.nombre)}</h3><p>${escHtml(p.descripcion || '')}</p><p><strong>${dinero(p.precio)}</strong></p></article>`).join('')),
        llenar('serviceGrid', t.servicios.map((s) => `<article><h3>${escHtml(s.nombre)}</h3><p>${escHtml(s.texto || '')}</p></article>`).join('')),
        llenar('aboutTitle', escHtml(t.nosotros.titulo)),
        llenar('aboutText', parrafos),
        (h) => h.replace(/(<(\w+)[^>]*data-txt="(\w+)"[^>]*>)(<\/\2>)/g, (m, a, tag, k, b) => a + escHtml(t.textos[k] || '') + b),
        (h) => h.replace(/(<(\w+)[^>]*data-contact="(\w+)"[^>]*>)(<\/\2>)/g, (m, a, tag, k, b) => a + escHtml(t.contacto[k] || '') + b),
    ];
    return pasos.reduce((h, paso) => paso(h), html);
}

// La portada sale con el título, la descripción, el color, el ícono y los datos para Google definidos en el panel,
// para que Google, WhatsApp/Facebook y la pestaña del navegador los vean sin esperar al JavaScript
app.get(['/', '/index.html'], async (req, res, next) => {
    try {
        const [html, t] = await Promise.all([fs.promises.readFile(path.join(PUBLIC, 'index.html'), 'utf8'), datos.tienda()]);
        const icono = t.marca.logo && t.marca.logo !== 'assets/img/logo.webp' ? t.marca.logo : 'assets/img/favicon.png';
        const base = origen(req);
        const imagen = absoluta(base, t.portada.imagen || t.marca.logo || 'assets/img/logo.webp');
        const meta = [
            `<link rel="canonical" href="${escHtml(base)}/">`,
            '<meta property="og:type" content="website">',
            '<meta property="og:locale" content="es_PE">',
            `<meta property="og:site_name" content="${escHtml(t.marca.nombre)}">`,
            `<meta property="og:title" content="${escHtml(t.seo.titulo)}">`,
            `<meta property="og:description" content="${escHtml(t.seo.descripcion)}">`,
            `<meta property="og:url" content="${escHtml(base)}/">`,
            `<meta property="og:image" content="${escHtml(imagen)}">`,
            '<meta name="twitter:card" content="summary_large_image">',
            `<script type="application/ld+json">${datosEstructurados(t, base)}</script>`,
        ].join('\n    ');
        res.set('Cache-Control', 'no-cache').type('html').send(contenidoInicial(html, t)
            .replace(/<title>[^<]*<\/title>/, () => `<title>${escHtml(t.seo.titulo)}</title>`)
            .replace(/(<meta name="description" content=")[^"]*/, (m, a) => a + escHtml(t.seo.descripcion))
            .replace(/(<meta name="theme-color" content=")[^"]*/, (m, a) => a + escHtml(t.colores.primario))
            .replace(/(<link rel="icon" href=")[^"]*/, (m, a) => a + escHtml(icono))
            .replace('</head>', () => `    ${meta}\n</head>`));
    } catch (err) { next(err); }
});
app.get('/favicon.ico', (req, res) => res.redirect(301, '/assets/img/favicon.png'));

// Sitemap y robots.txt para Google
app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origen(req)}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);
});
app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${origen(req)}/sitemap.xml\n`);
});

app.use(express.static(PUBLIC));

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
