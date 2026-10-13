/**
 * CIAP Informática - Panel de administración
 * Productos, categorías, servicios, pedidos, mensajes y datos de la tienda.
 */
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let D = null;            // todos los datos del panel
    let vista = 'resumen';

    const ICONOS = [
        ['laptop', 'Laptop'], ['desktop', 'Computadora'], ['cpu', 'Procesador'], ['keyboard', 'Teclado'],
        ['wifi', 'WiFi'], ['printer', 'Impresora'], ['wrench', 'Herramienta'], ['shield', 'Escudo'],
        ['cloud', 'Nube'], ['server', 'Servidor'], ['truck', 'Camión'], ['card', 'Tarjeta'],
        ['headset', 'Auriculares'], ['check', 'Check'],
    ];
    const ESTADOS = { pendiente: 'warn', confirmado: 'blue', entregado: 'ok', cancelado: 'bad' };

    const money = (n) => `${D.configuracion.moneda} ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fecha = (f) => (f ? new Date(f).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '');

    let toastTimer;
    function toast(msg, error) {
        const el = $('#toast');
        el.textContent = msg;
        el.className = 'toast show' + (error ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), error ? 4500 : 2200);
    }

    /* ---------- Servidor ---------- */

    async function api(metodo, ruta, cuerpo) {
        const opciones = { method: metodo, credentials: 'same-origin', headers: {} };
        if (cuerpo instanceof Blob) {
            opciones.headers['Content-Type'] = cuerpo.type;
            opciones.body = cuerpo;
        } else if (cuerpo !== undefined) {
            opciones.headers['Content-Type'] = 'application/json';
            opciones.body = JSON.stringify(cuerpo);
        }
        const res = await fetch('/api/admin' + ruta, opciones);
        const json = await res.json().catch(() => ({}));
        if (res.status === 401 && ruta !== '/login') {
            mostrarLogin();
            throw new Error('La sesión expiró. Vuelve a entrar.');
        }
        if (!res.ok || json.ok === false) throw new Error(json.error || 'No se pudo completar la acción.');
        return json;
    }

    /** Ejecuta una acción, recarga los datos y avisa del resultado */
    async function accion(fn, mensaje) {
        try {
            await fn();
            await cargar();
            if (mensaje) toast(mensaje);
            return true;
        } catch (err) {
            toast(err.message, true);
            return false;
        }
    }

    async function cargar() {
        D = await api('GET', '/datos');
        render();
    }

    /* ---------- Acceso ---------- */

    function mostrarLogin(aviso) {
        $('#app').hidden = true;
        $('#login').hidden = false;
        const el = $('#loginAviso');
        el.hidden = !aviso;
        el.textContent = aviso || '';
    }

    async function iniciar() {
        const s = await api('GET', '/sesion');
        if (!s.activo) {
            mostrarLogin('El panel no está activado. Define la variable ADMIN_PASSWORD (8 caracteres o más) en Render o en tu archivo .env y reinicia.');
            return;
        }
        if (!s.sesion) { mostrarLogin(); return; }
        $('#login').hidden = true;
        $('#app').hidden = false;
        await cargar();
    }

    /* ---------- Vistas ---------- */

    const cabecera = (titulo, texto, boton) => `
        <div class="head">
            <div><h1>${titulo}</h1>${texto ? `<p>${texto}</p>` : ''}</div>
            ${boton || ''}
        </div>`;

    const tabla = (columnas, filas, vacio) => (filas.length
        ? `<div class="tabla-wrap"><table><thead><tr>${columnas.map((c) => `<th${c.endsWith('*') ? ' class="num"' : ''}>${c.replace('*', '')}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table></div>`
        : `<div class="tabla-wrap"><p class="vacio">${vacio}</p></div>`);

    const visible = (x) => (x.activo === false ? '<span class="pill">Oculto</span>' : '<span class="pill ok">Visible</span>');
    const acciones = (tipo, id) => `
        <td class="acciones">
            <button class="btn btn-ghost btn-sm" data-editar="${tipo}" data-id="${esc(id)}">Editar</button>
            <button class="btn btn-danger btn-sm" data-borrar="${tipo}" data-id="${esc(id)}">Borrar</button>
        </td>`;

    function filaPedido(p) {
        return `<tr>
            <td><strong>${esc(p.folio)}</strong><small>${fecha(p.fecha)}</small></td>
            <td>${(p.items || []).map((i) => `${esc(i.cantidad)} × ${esc(i.nombre)}`).join('<br>')}</td>
            <td class="num">${money(p.total)}</td>
            <td><select class="estado" data-estado="${esc(p.folio)}" aria-label="Estado del pedido ${esc(p.folio)}">
                ${Object.keys(ESTADOS).map((e) => `<option value="${e}"${e === p.estado ? ' selected' : ''}>${e[0].toUpperCase() + e.slice(1)}</option>`).join('')}
            </select></td>
            <td class="acciones"><button class="btn btn-danger btn-sm" data-borrar="pedidos" data-id="${esc(p.folio)}">Borrar</button></td>
        </tr>`;
    }
    const COLS_PEDIDO = ['Pedido', 'Productos', 'Total*', 'Estado', ''];

    const VISTAS = {
        resumen() {
            const pendientes = D.pedidos.filter((p) => p.estado === 'pendiente');
            const sinLeer = D.mensajes.filter((m) => !m.leido).length;
            const visibles = D.productos.filter((p) => p.activo !== false);
            const agotados = visibles.filter((p) => !(p.stock > 0)).length;
            return cabecera('Resumen', 'Lo que necesita tu atención hoy.') + `
                <div class="tiles">
                    <button class="tile${pendientes.length ? ' alerta' : ''}" data-vista="pedidos"><strong>${pendientes.length}</strong><span>pedidos pendientes</span></button>
                    <button class="tile${sinLeer ? ' alerta' : ''}" data-vista="mensajes"><strong>${sinLeer}</strong><span>mensajes sin leer</span></button>
                    <button class="tile" data-vista="productos"><strong>${visibles.length}</strong><span>productos visibles</span></button>
                    <button class="tile${agotados ? ' alerta' : ''}" data-vista="productos"><strong>${agotados}</strong><span>productos agotados</span></button>
                </div>
                <h2 class="sub">Últimos pedidos</h2>
                ${tabla(COLS_PEDIDO, D.pedidos.slice(0, 6).map(filaPedido), 'Todavía no hay pedidos. Aparecerán aquí cuando un cliente pida desde el carrito.')}`;
        },

        pedidos() {
            return cabecera('Pedidos', 'Pedidos enviados desde el carrito. El cobro y la entrega se coordinan por WhatsApp.')
                + tabla(COLS_PEDIDO, D.pedidos.map(filaPedido), 'Todavía no hay pedidos.');
        },

        mensajes() {
            const lista = D.mensajes.map((m) => {
                const tel = String(m.telefono || '').replace(/\D/g, '');
                return `<article class="mensaje${m.leido ? ' leido' : ''}">
                    <div class="mensaje-top"><strong>${esc(m.nombre)}${m.asunto ? ` · ${esc(m.asunto)}` : ''}</strong><span>${fecha(m.fecha)}</span></div>
                    <p>${esc(m.mensaje)}</p>
                    <div class="mensaje-acc">
                        ${tel ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${tel}">WhatsApp ${esc(m.telefono)}</a>` : ''}
                        <button class="btn btn-ghost btn-sm" data-leido="${esc(m.id)}" data-valor="${m.leido ? '0' : '1'}">${m.leido ? 'Marcar como no leído' : 'Marcar como leído'}</button>
                        <button class="btn btn-danger btn-sm" data-borrar="mensajes" data-id="${esc(m.id)}">Borrar</button>
                    </div>
                </article>`;
            });
            return cabecera('Mensajes', 'Lo que escriben los clientes en el formulario de contacto.')
                + (lista.length ? `<div class="mensajes">${lista.join('')}</div>` : '<div class="tabla-wrap"><p class="vacio">Todavía no hay mensajes.</p></div>');
        },

        productos() {
            const cats = Object.fromEntries(D.categorias.map((c) => [c.slug, c.nombre]));
            const filas = D.productos.map((p) => `<tr class="${p.activo === false ? 'fila-oculta' : ''}">
                <td>${p.imagen ? `<img class="mini" src="${esc(p.imagen)}" alt="">` : '<div class="mini-vacio"></div>'}</td>
                <td><strong>${esc(p.nombre)}</strong><small>${esc(cats[p.categoria] || 'Sin categoría')}${p.destacado ? ' · Destacado' : ''}</small></td>
                <td class="num">${money(p.precio)}</td>
                <td class="num">${p.stock > 0 ? esc(p.stock) : '<span class="pill bad">Agotado</span>'}</td>
                <td>${visible(p)}</td>
                ${acciones('productos', p.id)}
            </tr>`);
            return cabecera('Productos', `${D.productos.length} en el catálogo.`, '<button class="btn" data-nuevo="productos">+ Nuevo producto</button>')
                + tabla(['Foto', 'Producto', 'Precio*', 'Stock*', 'Estado', ''], filas, 'No hay productos. Crea el primero con el botón de arriba.');
        },

        categorias() {
            const filas = D.categorias.map((c) => `<tr class="${c.activo === false ? 'fila-oculta' : ''}">
                <td><strong>${esc(c.nombre)}</strong></td>
                <td class="num">${D.productos.filter((p) => p.categoria === c.slug).length}</td>
                <td class="num">${esc(c.orden ?? '')}</td>
                <td>${visible(c)}</td>
                ${acciones('categorias', c.slug)}
            </tr>`);
            return cabecera('Categorías', 'Agrupan los productos del catálogo.', '<button class="btn" data-nuevo="categorias">+ Nueva categoría</button>')
                + tabla(['Categoría', 'Productos*', 'Orden*', 'Estado', ''], filas, 'No hay categorías.');
        },

        servicios() {
            const filas = D.servicios.map((s) => `<tr class="${s.activo === false ? 'fila-oculta' : ''}">
                <td><strong>${esc(s.nombre)}</strong><small>${esc(s.texto)}</small></td>
                <td class="num">${money(s.desde)}</td>
                <td>${visible(s)}</td>
                ${acciones('servicios', s.id)}
            </tr>`);
            return cabecera('Servicios', 'Los servicios técnicos que ofrece la tienda.', '<button class="btn" data-nuevo="servicios">+ Nuevo servicio</button>')
                + tabla(['Servicio', 'Desde*', 'Estado', ''], filas, 'No hay servicios.');
        },

        tienda() {
            const c = D.configuracion;
            const lineas = (arr, campos) => (arr || []).map((o) => campos.map((k) => o[k] || '').join(' | ')).join('\n');
            return cabecera('Datos de la tienda', 'Marca, contacto y textos que se ven en la tienda.') + `
                <form id="formTienda">
                    <div class="caja"><h2>Marca</h2><div class="form">
                        <label>Nombre<input name="marca.nombre" value="${esc(c.marca.nombre)}" maxlength="40" required></label>
                        <label>Subtítulo<input name="marca.subtitulo" value="${esc(c.marca.subtitulo)}" maxlength="40"></label>
                        <label>Símbolo de moneda<input name="moneda" value="${esc(c.moneda)}" maxlength="6" required></label>
                    </div></div>

                    <div class="caja"><h2>Contacto</h2><div class="form">
                        <label>WhatsApp<input name="contacto.whatsapp" value="${esc(c.contacto.whatsapp)}" inputmode="numeric" maxlength="20"><small>Con código de país y solo números, ej. 51987654321. Aquí llegan los pedidos.</small></label>
                        <label>Teléfono<input name="contacto.telefono" value="${esc(c.contacto.telefono)}" maxlength="40"></label>
                        <label>Correo<input name="contacto.email" type="email" value="${esc(c.contacto.email)}" maxlength="120"></label>
                        <label>Horario<input name="contacto.horario" value="${esc(c.contacto.horario)}" maxlength="100"></label>
                        <label class="full">Dirección<input name="contacto.direccion" value="${esc(c.contacto.direccion)}" maxlength="200"></label>
                    </div></div>

                    <div class="caja"><h2>Portada</h2><div class="form">
                        <label class="full">Etiqueta superior<input name="portada.etiqueta" value="${esc(c.portada.etiqueta)}" maxlength="80"></label>
                        <label>Título<input name="portada.titulo" value="${esc(c.portada.titulo)}" maxlength="60"></label>
                        <label>Título resaltado (segunda línea)<input name="portada.resaltado" value="${esc(c.portada.resaltado)}" maxlength="60"></label>
                        <label class="full">Texto<textarea name="portada.texto" maxlength="400">${esc(c.portada.texto)}</textarea></label>
                    </div></div>

                    <div class="caja"><h2>Nosotros</h2><div class="form">
                        <label class="full">Título<input name="nosotros.titulo" value="${esc(c.nosotros.titulo)}" maxlength="120"></label>
                        <label class="full">Texto<textarea name="nosotros.texto" rows="6" maxlength="1500">${esc(c.nosotros.texto)}</textarea><small>Deja una línea en blanco para separar párrafos.</small></label>
                        <label class="full">Cifras<textarea name="estadisticas" rows="3">${esc(lineas(c.estadisticas, ['numero', 'texto']))}</textarea><small>Una por línea, máximo 4: <code>12+ | años de experiencia</code></small></label>
                        <label class="full">Por qué elegirnos<textarea name="valores" rows="4">${esc(lineas(c.valores, ['icono', 'titulo', 'texto']))}</textarea><small>Una por línea, máximo 4: <code>ícono | título | texto</code></small></label>
                        <label class="full">Beneficios<textarea name="beneficios" rows="4">${esc(lineas(c.beneficios, ['icono', 'titulo', 'texto']))}</textarea><small>Una por línea, máximo 4: <code>ícono | título | texto</code>. Íconos: ${ICONOS.map((i) => i[0]).join(', ')}.</small></label>
                    </div></div>

                    <div class="barra"><button class="btn">Guardar cambios</button></div>
                </form>`;
        },
    };

    function render() {
        $('#vista').innerHTML = VISTAS[vista]();
        $$('#menu [data-vista]').forEach((b) => b.classList.toggle('active', b.dataset.vista === vista));
        const n = { pedidos: D.pedidos.filter((p) => p.estado === 'pendiente').length, mensajes: D.mensajes.filter((m) => !m.leido).length };
        $$('[data-n]').forEach((b) => { b.textContent = n[b.dataset.n]; b.hidden = !n[b.dataset.n]; });
    }

    function ir(nombre) {
        vista = VISTAS[nombre] ? nombre : 'resumen';
        render();
        window.scrollTo(0, 0);
    }

    /* ---------- Formularios de productos, categorías y servicios ---------- */

    const TIPOS = {
        productos: {
            singular: 'producto', clave: 'id',
            nuevo: () => ({ activo: true, stock: 1, specs: [], categoria: (D.categorias[0] || {}).slug }),
            campos: [
                { l: 'Nombre', campo: 'nombre', max: 150, req: true, full: true },
                { t: 'select', l: 'Categoría', campo: 'categoria', opciones: () => D.categorias.map((c) => [c.slug, c.nombre]) },
                { l: 'Etiqueta', campo: 'etiqueta', max: 30, ayuda: 'Opcional. Ej. Nuevo, Oferta.' },
                { t: 'number', l: 'Precio', campo: 'precio', step: '0.01', req: true },
                { t: 'number', l: 'Precio anterior', campo: 'precioAntes', step: '0.01', ayuda: 'Opcional. Si es mayor, se muestra como oferta.' },
                { t: 'number', l: 'Stock', campo: 'stock', step: '1' },
                { t: 'number', l: 'Orden', campo: 'orden', step: '1', ayuda: 'Los números menores salen primero.' },
                { t: 'textarea', l: 'Descripción', campo: 'descripcion', max: 1000, full: true },
                { t: 'lines', l: 'Características', campo: 'specs', full: true, ayuda: 'Una por línea, máximo 8. Ej. 16 GB RAM' },
                { t: 'image', l: 'Foto', campo: 'imagen', full: true },
                { t: 'check', l: 'Destacado en la portada', campo: 'destacado' },
                { t: 'check', l: 'Visible en la tienda', campo: 'activo' },
            ],
        },
        categorias: {
            singular: 'categoría', clave: 'slug',
            nuevo: () => ({ activo: true, icono: 'cpu' }),
            campos: [
                { l: 'Nombre', campo: 'nombre', max: 60, req: true, full: true },
                { t: 'select', l: 'Ícono', campo: 'icono', opciones: () => ICONOS },
                { t: 'number', l: 'Orden', campo: 'orden', step: '1' },
                { t: 'check', l: 'Visible en la tienda', campo: 'activo' },
            ],
        },
        servicios: {
            singular: 'servicio', clave: 'id',
            nuevo: () => ({ activo: true, icono: 'wrench', incluye: [] }),
            campos: [
                { l: 'Nombre', campo: 'nombre', max: 100, req: true, full: true },
                { t: 'select', l: 'Ícono', campo: 'icono', opciones: () => ICONOS },
                { t: 'number', l: 'Precio desde', campo: 'desde', step: '0.01' },
                { t: 'textarea', l: 'Descripción', campo: 'texto', max: 400, full: true },
                { t: 'lines', l: 'Incluye', campo: 'incluye', full: true, ayuda: 'Una por línea, máximo 5.' },
                { t: 'number', l: 'Orden', campo: 'orden', step: '1' },
                { t: 'check', l: 'Visible en la tienda', campo: 'activo' },
            ],
        },
    };

    function campoHtml(c, v) {
        const ayuda = c.ayuda ? `<small>${c.ayuda}</small>` : '';
        const clase = c.full ? ' class="full"' : '';
        const req = c.req ? ' required' : '';
        switch (c.t) {
            case 'check':
                return `<label class="check"><input type="checkbox" name="${c.campo}"${v ? ' checked' : ''}>${c.l}</label>`;
            case 'select':
                return `<label${clase}>${c.l}<select name="${c.campo}">${c.opciones().map(([val, txt]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select>${ayuda}</label>`;
            case 'textarea':
                return `<label${clase}>${c.l}<textarea name="${c.campo}" maxlength="${c.max}"${req}>${esc(v)}</textarea>${ayuda}</label>`;
            case 'lines':
                return `<label${clase}>${c.l}<textarea name="${c.campo}" rows="4">${esc((v || []).join('\n'))}</textarea>${ayuda}</label>`;
            case 'number':
                return `<label${clase}>${c.l}<input type="number" name="${c.campo}" min="0" step="${c.step}" value="${esc(v ?? '')}"${req}>${ayuda}</label>`;
            case 'image':
                return `<div class="full"><label>${c.l}</label>
                    <div class="foto">
                        <span data-foto-vista>${v ? `<img src="${esc(v)}" alt="">` : '<div class="mini-vacio"></div>'}</span>
                        <div>
                            <div class="foto-acc">
                                <label class="btn btn-ghost btn-sm">Subir foto<input type="file" accept="image/jpeg,image/png,image/webp" data-foto hidden></label>
                                <button type="button" class="btn btn-danger btn-sm" data-foto-quitar>Quitar</button>
                            </div>
                            <small class="muted">JPG, PNG o WEBP. Se reduce sola a 1000 px.</small>
                        </div>
                        <input type="hidden" name="${c.campo}" value="${esc(v || '')}">
                    </div></div>`;
            default:
                return `<label${clase}>${c.l}<input name="${c.campo}" maxlength="${c.max}" value="${esc(v ?? '')}"${req}>${ayuda}</label>`;
        }
    }

    function abrirFormulario(tipo, id) {
        const def = TIPOS[tipo];
        const actual = id === undefined ? null : D[tipo].find((x) => String(x[def.clave]) === String(id));
        const valores = actual || def.nuevo();
        const modal = $('#modal');
        modal.innerHTML = `
            <form data-tipo="${tipo}" data-id="${actual ? esc(actual[def.clave]) : ''}">
                <div class="modal-head"><h2>${actual ? 'Editar' : 'Nuevo'} ${def.singular}</h2><button type="button" data-cerrar aria-label="Cerrar">×</button></div>
                <div class="modal-body"><div class="form">${def.campos.map((c) => campoHtml(c, valores[c.campo])).join('')}</div></div>
                <div class="modal-foot">
                    <button type="button" class="btn btn-ghost" data-cerrar>Cancelar</button>
                    <button class="btn">Guardar</button>
                </div>
            </form>`;
        modal.showModal();
    }

    function leerFormulario(form) {
        const def = TIPOS[form.dataset.tipo];
        const doc = {};
        for (const c of def.campos) {
            const el = form.elements[c.campo];
            if (c.t === 'check') doc[c.campo] = el.checked;
            else if (c.t === 'number') doc[c.campo] = el.value === '' ? null : Number(el.value);
            else if (c.t === 'lines') doc[c.campo] = el.value.split('\n').map((l) => l.trim()).filter(Boolean);
            else doc[c.campo] = el.value.trim();
        }
        return doc;
    }

    /** Reduce la foto en el navegador (máx. 1000 px) antes de subirla: ocupa menos en la base */
    async function reducirImagen(archivo) {
        const img = await createImageBitmap(archivo);
        const k = Math.min(1, 1000 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        const ctx = canvas.getContext('2d');
        // Fondo blanco: los PNG transparentes se guardan como JPG
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return new Promise((ok, fallo) => canvas.toBlob((b) => (b ? ok(b) : fallo(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', 0.86));
    }

    /* ---------- Guardar datos de la tienda ---------- */

    function leerTienda(form) {
        const f = new FormData(form);
        const lista = (nombre, campos) => String(f.get(nombre)).split('\n').map((l) => l.trim()).filter(Boolean)
            .map((l) => { const partes = l.split('|').map((p) => p.trim()); return Object.fromEntries(campos.map((k, i) => [k, partes[i] || ''])); });
        const grupo = (g, campos) => Object.fromEntries(campos.map((k) => [k, String(f.get(`${g}.${k}`) || '').trim()]));
        return {
            marca: grupo('marca', ['nombre', 'subtitulo']),
            contacto: grupo('contacto', ['whatsapp', 'telefono', 'email', 'direccion', 'horario']),
            moneda: String(f.get('moneda')).trim(),
            portada: grupo('portada', ['etiqueta', 'titulo', 'resaltado', 'texto']),
            nosotros: grupo('nosotros', ['titulo', 'texto']),
            estadisticas: lista('estadisticas', ['numero', 'texto']),
            valores: lista('valores', ['icono', 'titulo', 'texto']),
            beneficios: lista('beneficios', ['icono', 'titulo', 'texto']),
        };
    }

    /* ---------- Eventos ---------- */

    $('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const aviso = $('#loginAviso');
        try {
            await api('POST', '/login', { usuario: f.get('usuario'), password: f.get('password') });
            e.target.reset();
            await iniciar();
        } catch (err) {
            aviso.hidden = false;
            aviso.className = 'aviso error';
            aviso.textContent = err.message;
        }
    });

    $$('[data-salir]').forEach((b) => b.addEventListener('click', async () => {
        await api('POST', '/logout').catch(() => {});
        mostrarLogin();
    }));

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-vista],[data-nuevo],[data-editar],[data-borrar],[data-leido],[data-cerrar],[data-foto-quitar]');
        if (!el) return;
        const d = el.dataset;
        if (d.vista) ir(d.vista);
        else if (d.nuevo) abrirFormulario(d.nuevo);
        else if (d.editar) abrirFormulario(d.editar, d.id);
        else if ('cerrar' in d) $('#modal').close();
        else if ('fotoQuitar' in d) {
            const caja = el.closest('.foto');
            $('input[type="hidden"]', caja).value = '';
            $('[data-foto-vista]', caja).innerHTML = '<div class="mini-vacio"></div>';
        } else if (d.leido) {
            accion(() => api('PATCH', `/mensajes/${d.leido}`, { leido: d.valor === '1' }));
        } else if (d.borrar) {
            const nombres = { productos: 'este producto', categorias: 'esta categoría', servicios: 'este servicio', pedidos: `el pedido ${d.id}`, mensajes: 'este mensaje' };
            if (!confirm(`¿Borrar ${nombres[d.borrar]}? No se puede deshacer.`)) return;
            accion(() => api('DELETE', `/${d.borrar}/${encodeURIComponent(d.id)}`), 'Borrado');
        }
    });

    document.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.matches('[data-estado]')) {
            accion(() => api('PATCH', `/pedidos/${encodeURIComponent(t.dataset.estado)}`, { estado: t.value }), 'Estado actualizado');
        } else if (t.matches('[data-foto]') && t.files[0]) {
            const caja = t.closest('.foto');
            try {
                const r = await api('POST', '/imagenes', await reducirImagen(t.files[0]));
                $('input[type="hidden"]', caja).value = r.url;
                $('[data-foto-vista]', caja).innerHTML = `<img src="${esc(r.url)}" alt="">`;
            } catch (err) {
                toast(err.message, true);
            }
            t.value = '';
        }
    });

    document.addEventListener('submit', async (e) => {
        const form = e.target;
        if (form.id === 'formTienda') {
            e.preventDefault();
            accion(() => api('PUT', '/configuracion', leerTienda(form)), 'Cambios guardados');
        } else if (form.dataset.tipo) {
            e.preventDefault();
            const { tipo, id } = form.dataset;
            const boton = $('.modal-foot .btn:not(.btn-ghost)', form);
            boton.disabled = true;
            const ok = await accion(() => (id
                ? api('PUT', `/${tipo}/${encodeURIComponent(id)}`, leerFormulario(form))
                : api('POST', `/${tipo}`, leerFormulario(form))), 'Guardado');
            boton.disabled = false;
            if (ok) $('#modal').close();
        }
    });

    iniciar().catch((err) => mostrarLogin(err.message));
})();
