/**
 * CIAP Informática - Acceso al panel de administración
 *
 * El usuario y la contraseña se definen con las variables ADMIN_USER y ADMIN_PASSWORD.
 * La sesión viaja en una cookie firmada (no se guarda nada en el servidor), así que
 * sigue siendo válida aunque Render reinicie el servicio.
 */
'use strict';

const crypto = require('crypto');

const USUARIO = (process.env.ADMIN_USER || 'admin').trim();
const PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const COOKIE = 'ciap_admin';
const HORAS_SESION = 8;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// La clave de firma cambia si cambia la contraseña: eso cierra todas las sesiones abiertas
const SECRETO = crypto.createHash('sha256')
    .update(`ciap-sesion|${PASSWORD}|${process.env.MONGODB_URI || ''}`).digest();

/** El panel solo se activa con una contraseña de 8 caracteres o más */
const configurado = () => PASSWORD.length >= 8;

/** Compara en tiempo constante (no revela cuántos caracteres coinciden) */
function iguales(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

const firma = (texto) => crypto.createHmac('sha256', SECRETO).update(texto).digest('hex');

function crearToken() {
    const expira = String(Date.now() + HORAS_SESION * 3600 * 1000);
    return `${expira}.${firma(expira)}`;
}

function tokenValido(token) {
    const [expira, sello] = String(token || '').split('.');
    if (!expira || !sello || !iguales(sello, firma(expira))) return false;
    return Number(expira) > Date.now();
}

function leerCookie(req) {
    for (const par of String(req.headers.cookie || '').split(';')) {
        const i = par.indexOf('=');
        if (i > 0 && par.slice(0, i).trim() === COOKIE) return par.slice(i + 1).trim();
    }
    return '';
}

const haySesion = (req) => configurado() && tokenValido(leerCookie(req));

function opcionesCookie(req) {
    return { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/', maxAge: HORAS_SESION * 3600 * 1000 };
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

/* ---------- Rutas y filtros ---------- */

function login(req, res) {
    if (!configurado()) return res.status(503).json({ ok: false, error: 'El panel no está activado: falta ADMIN_PASSWORD.' });
    if (bloqueado(req.ip)) return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera 15 minutos.' });

    const b = req.body || {};
    // Se evalúan los dos para no revelar cuál falló
    const okUsuario = iguales(b.usuario || '', USUARIO);
    const okPassword = iguales(b.password || '', PASSWORD);
    if (!okUsuario || !okPassword) {
        registrarFallo(req.ip);
        return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }
    intentos.delete(req.ip);
    res.cookie(COOKIE, crearToken(), opcionesCookie(req));
    res.json({ ok: true });
}

function logout(req, res) {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
}

function requiereSesion(req, res, next) {
    if (!haySesion(req)) return res.status(401).json({ ok: false, error: 'Inicia sesión para continuar.' });
    next();
}

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

module.exports = { configurado, haySesion, login, logout, requiereSesion, mismoOrigen };
