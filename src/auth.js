/**
 * CIAP Informática - Acceso al panel de administración
 *
 * El primer acceso usa las variables ADMIN_USER y ADMIN_PASSWORD. Cuando el
 * administrador cambia su usuario o contraseña desde el panel, se guardan
 * (cifrados) en la colección "usuarios" y las variables dejan de valer.
 *
 * La sesión viaja en una cookie firmada (no se guarda nada en el servidor), así
 * que sigue siendo válida aunque Render reinicie el servicio.
 */
'use strict';

const crypto = require('crypto');
const datos = require('./db');

const USUARIO_ENV = (process.env.ADMIN_USER || 'admin').trim();
const PASSWORD_ENV = (process.env.ADMIN_PASSWORD || '').trim();
const COOKIE = 'ciap_admin';
const HORAS_SESION = 8;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const MIN_PASSWORD = 8;
const CACHE_MS = 30 * 1000;

const SECRETO = crypto.createHash('sha256')
    .update(`ciap-sesion|${PASSWORD_ENV}|${process.env.MONGODB_URI || ''}`).digest();

const sha = (texto) => crypto.createHash('sha256').update(String(texto)).digest();

/** Compara en tiempo constante (no revela cuántos caracteres coinciden) */
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

/* ---------- Credenciales ---------- */

// La contraseña nunca se guarda tal cual: solo su derivada con scrypt y una sal aleatoria
const derivar = (password, sal) => crypto.scryptSync(String(password), sal, 64).toString('hex');

let cache = { cred: undefined, hasta: 0 };

/**
 * Credenciales vigentes: las guardadas en la base o, si aún no hay, las de las variables.
 * Devuelve null si el panel no está activado. "version" cambia con cada contraseña:
 * va dentro de la firma de la sesión, así cambiarla cierra las demás sesiones abiertas.
 */
async function credenciales() {
    if (cache.cred !== undefined && Date.now() < cache.hasta) return cache.cred;

    let cred = null;
    const base = await datos.db();
    const doc = base ? await base.collection('usuarios').findOne({ _id: 'admin' }) : null;
    if (doc && doc.hash && doc.sal) {
        cred = { usuario: doc.usuario, version: doc.hash, valida: (p) => iguales(derivar(p, doc.sal), doc.hash) };
    } else if (PASSWORD_ENV.length >= MIN_PASSWORD) {
        cred = { usuario: USUARIO_ENV, version: sha(PASSWORD_ENV).toString('hex'), valida: (p) => iguales(p, PASSWORD_ENV) };
    }
    cache = { cred, hasta: Date.now() + CACHE_MS };
    return cred;
}

/* ---------- Sesión ---------- */

const firma = (expira, version) => crypto.createHmac('sha256', SECRETO).update(`${expira}|${version}`).digest('hex');

function crearToken(cred) {
    const expira = String(Date.now() + HORAS_SESION * 3600 * 1000);
    return `${expira}.${firma(expira, cred.version)}`;
}

function leerCookie(req) {
    for (const par of String(req.headers.cookie || '').split(';')) {
        const i = par.indexOf('=');
        if (i > 0 && par.slice(0, i).trim() === COOKIE) return par.slice(i + 1).trim();
    }
    return '';
}

async function haySesion(req) {
    const cred = await credenciales();
    if (!cred) return false;
    const [expira, sello] = leerCookie(req).split('.');
    if (!expira || !sello || !iguales(sello, firma(expira, cred.version))) return false;
    return Number(expira) > Date.now();
}

function ponerCookie(req, res, cred) {
    res.cookie(COOKIE, crearToken(cred), {
        httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/', maxAge: HORAS_SESION * 3600 * 1000,
    });
}

/* ---------- Bloqueo por intentos fallidos ---------- */

const intentos = new Map(); // ip → { n, hasta }

function bloqueado(ip) {
    const r = intentos.get(ip);
    if (!r) return false;
    if (r.hasta && r.hasta > Date.now()) return true;
    if (r.hasta) intentos.delete(ip);
    return false;
}

function registrarFallo(ip) {
    const r = intentos.get(ip) || { n: 0, hasta: 0 };
    r.n += 1;
    if (r.n >= MAX_INTENTOS) r.hasta = Date.now() + BLOQUEO_MS;
    intentos.set(ip, r);
}

const DEMASIADOS = { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' };

/* ---------- Rutas y filtros ---------- */

// Envuelve las rutas asíncronas: los errores van al manejador general
const ruta = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const estado = ruta(async (req, res) => {
    const cred = await credenciales();
    res.json({ ok: true, activo: Boolean(cred), sesion: await haySesion(req) });
});

const login = ruta(async (req, res) => {
    const cred = await credenciales();
    if (!cred) return res.status(503).json({ ok: false, error: 'El panel no está activado: falta ADMIN_PASSWORD.' });
    if (bloqueado(req.ip)) return res.status(429).json(DEMASIADOS);

    const b = req.body || {};
    // Se evalúan los dos para no revelar cuál falló
    const okUsuario = iguales(b.usuario || '', cred.usuario);
    const okPassword = cred.valida(b.password || '');
    if (!okUsuario || !okPassword) {
        registrarFallo(req.ip);
        return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }
    intentos.delete(req.ip);
    ponerCookie(req, res, cred);
    res.json({ ok: true });
});

function logout(req, res) {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
}

const requiereSesion = ruta(async (req, res, next) => {
    if (!await haySesion(req)) return res.status(401).json({ ok: false, error: 'Inicia sesión para continuar.' });
    next();
});

/** Los cambios solo se aceptan si vienen de la propia página (protección CSRF) */
function mismoOrigen(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origen = req.get('origin');
    if (origen) {
        let host = '';
        try { host = new URL(origen).host; } catch (e) { /* origen no válido */ }
        if (host !== req.get('host')) return res.status(403).json({ ok: false, error: 'Origen no permitido.' });
    }
    next();
}

/** Usuario con el que se entra al panel */
const usuarioActual = async () => ((await credenciales()) || {}).usuario || '';

/**
 * Cambia el usuario y/o la contraseña del administrador (requiere sesión y base de datos).
 * Siempre pide la contraseña actual: una sesión abierta en otro equipo no basta para cambiarla.
 */
const cambiarAcceso = ruta(async (req, res) => {
    if (bloqueado(req.ip)) return res.status(429).json(DEMASIADOS);
    const cred = await credenciales();
    const b = req.body || {};
    const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

    const actual = texto(b.actual, 200);
    const nueva = texto(b.nueva, 200);
    const usuario = texto(b.usuario, 40).trim() || cred.usuario;

    if (!cred.valida(actual)) {
        registrarFallo(req.ip);
        // 403 y no 401: el panel interpreta un 401 como "la sesión expiró" y vuelve a la pantalla de acceso
        return res.status(403).json({ ok: false, error: 'La contraseña actual no es correcta.' });
    }
    intentos.delete(req.ip);

    if (!/^[\w.@-]{3,40}$/.test(usuario)) {
        return res.status(422).json({ ok: false, error: 'El usuario debe tener de 3 a 40 letras, números, puntos o guiones, sin espacios.' });
    }
    if (nueva && nueva.length < MIN_PASSWORD) {
        return res.status(422).json({ ok: false, error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
    }
    if (nueva && nueva === actual) {
        return res.status(422).json({ ok: false, error: 'La nueva contraseña es igual a la actual.' });
    }
    if (!nueva && usuario === cred.usuario) {
        return res.status(422).json({ ok: false, error: 'No hay cambios que guardar.' });
    }

    // Si solo cambia el usuario se conserva la contraseña actual
    const sal = crypto.randomBytes(16).toString('hex');
    await req.base.collection('usuarios').updateOne(
        { _id: 'admin' },
        { $set: { usuario, sal, hash: derivar(nueva || actual, sal), actualizado: new Date() } },
        { upsert: true },
    );
    cache = { cred: undefined, hasta: 0 };

    // Esta sesión sigue abierta con la credencial nueva; las demás quedan cerradas
    ponerCookie(req, res, await credenciales());
    res.json({ ok: true, usuario });
});

module.exports = { estado, login, logout, requiereSesion, mismoOrigen, usuarioActual, cambiarAcceso };
