/**
 * CIAP Informática - Lógica de la tienda
 * Navegación por vistas, catálogo, carrito, favoritos y pedidos por WhatsApp.
 */
(function () {
    'use strict';

    let T; // datos de la tienda: llegan del servidor (api/tienda)
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ---------- Íconos (SVG de trazo, 24x24) ---------- */
    const ICONS = {
        laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
        desktop: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
        cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
        keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
        wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01"/>',
        printer: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.5"/><rect x="7" y="14" width="10" height="7"/>',
        wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
        cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18z"/>',
        server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
        truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
        card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
        headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M19.5 19a4 4 0 0 1-4 3H13"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
        cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12h11L21 7H6"/>',
        menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
        x: '<path d="M5 5l14 14M19 5L5 19"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
        phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.1A8.5 8.5 0 1 1 21 11.5z"/>',
    };
    const icon = (name) =>
        `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    /* ---------- Utilidades ---------- */
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (n) => `${T.moneda} ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let catMap = {};
    // Un producto con una categoría que ya no existe se sigue mostrando
    const catOf = (p) => catMap[p.categoria] || { nombre: '', icono: 'cpu' };
    // Foto del producto si tiene "imagen"; si no, el ícono de su categoría
    const visual = (p) => (p.imagen ? `<img src="${esc(p.imagen)}" alt="" loading="lazy">` : icon(catOf(p).icono));
    const byId = (id) => T.productos.find((p) => p.id === Number(id));
    const waUrl = (texto) => `https://wa.me/${T.contacto.whatsapp}?text=${encodeURIComponent(texto)}`;

    // El almacenamiento puede fallar (modo privado): la tienda sigue funcionando sin él
    const store = {
        get(key, def) {
            try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch (e) { return def; }
        },
        set(key, val) {
            try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* sin almacenamiento */ }
        },
    };

    let toastTimer;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    /* ---------- Estado ---------- */
    const VIEWS = ['inicio', 'productos', 'servicios', 'nosotros', 'contacto'];
    let cart = store.get('ciap_cart', {});   // { idProducto: cantidad }
    let favs = store.get('ciap_favs', []);   // [idProducto]
    const filtro = { categoria: 'todos', q: '', orden: 'destacado' };

    /* ---------- Navegación por vistas ---------- */
    function showView(name) {
        if (!VIEWS.includes(name)) name = 'inicio';
        $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === name));
        $$('[data-link]').forEach((a) => {
            if (a.dataset.link === name) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        $$('.view.active, .view.active .catalog-body').forEach((el) => { el.scrollTop = 0; });
        closeMenu();
    }
    const go = (name) => { if (location.hash === '#' + name) showView(name); else location.hash = name; };

    function closeMenu() {
        $('#nav').classList.remove('open');
        $('#btnMenu').setAttribute('aria-expanded', 'false');
        $('#btnMenu').innerHTML = icon('menu');
    }
    function toggleMenu() {
        const open = $('#nav').classList.toggle('open');
        $('#btnMenu').setAttribute('aria-expanded', String(open));
        $('#btnMenu').innerHTML = icon(open ? 'x' : 'menu');
    }

    /* ---------- Inicio / Nosotros / Contacto ---------- */
    function renderStatic() {
        $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
        $$('[data-cfg]').forEach((el) => { el.textContent = T.marca[el.dataset.cfg]; });

        const stats = T.estadisticas.map((s) => `<div><strong>${esc(s.numero)}</strong><span>${esc(s.texto)}</span></div>`).join('');
        $('#heroStats').innerHTML = stats;
        $('#aboutStats').innerHTML = stats;

        const conteo = {};
        T.productos.forEach((p) => { conteo[p.categoria] = (conteo[p.categoria] || 0) + 1; });
        $('#catTiles').innerHTML = T.categorias.map((c) => `
            <button class="cat-tile" data-cat="${esc(c.slug)}">
                ${icon(c.icono)}
                <strong>${esc(c.nombre)}</strong>
                <span>${conteo[c.slug] || 0} productos</span>
            </button>`).join('');

        $('#benefits').innerHTML = T.beneficios.map((b) => `
            <div class="benefit">${icon(b.icono)}<div><strong>${esc(b.titulo)}</strong><span>${esc(b.texto)}</span></div></div>`).join('');

        $('#values').innerHTML = T.valores.map((v) => `
            <div class="panel value">${icon(v.icono)}<div><h3>${esc(v.titulo)}</h3><p>${esc(v.texto)}</p></div></div>`).join('');

        const c = T.contacto;
        $('#contactList').innerHTML = [
            ['pin', 'Dirección', c.direccion],
            ['phone', 'Teléfono', c.telefono],
            ['mail', 'Correo', c.email],
            ['clock', 'Horario', c.horario],
        ].filter((r) => r[2]).map((r) => `<li>${icon(r[0])}<div><strong>${r[1]}</strong>${esc(r[2])}</div></li>`).join('');

        $('#fAsunto').innerHTML = ['Consulta de productos', 'Cotización']
            .concat(T.servicios.map((s) => 'Servicio: ' + s.nombre))
            .map((o) => `<option>${esc(o)}</option>`).join('');
    }

    /* ---------- Servicios ---------- */
    function renderServices() {
        $('#serviceGrid').innerHTML = T.servicios.map((s) => `
            <article class="panel service">
                <span class="service-ic">${icon(s.icono)}</span>
                <h3>${esc(s.nombre)}</h3>
                <p>${esc(s.texto)}</p>
                <ul>${s.incluye.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
                <div class="service-foot">
                    <span class="muted">Desde <strong>${money(s.desde)}</strong></span>
                    <button class="btn btn-line btn-sm" data-service="${esc(s.id)}">Solicitar</button>
                </div>
            </article>`).join('');
    }

    /* ---------- Catálogo ---------- */
    function renderChips() {
        const chips = [{ slug: 'todos', nombre: 'Todos' }].concat(T.categorias, [{ slug: 'favoritos', nombre: 'Favoritos' }]);
        $('#chips').innerHTML = chips.map((c) =>
            `<button class="chip${c.slug === filtro.categoria ? ' active' : ''}" data-cat="${esc(c.slug)}" role="tab" aria-selected="${c.slug === filtro.categoria}">${esc(c.nombre)}</button>`).join('');
    }

    function productosFiltrados() {
        const q = norm(filtro.q.trim());
        let lista = T.productos.filter((p) => {
            if (filtro.categoria === 'favoritos') { if (!favs.includes(p.id)) return false; }
            else if (filtro.categoria !== 'todos' && p.categoria !== filtro.categoria) return false;
            if (!q) return true;
            return norm([p.nombre, p.descripcion, catOf(p).nombre].concat(p.specs).join(' ')).includes(q);
        });
        const orden = {
            'destacado': (a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.id - b.id,
            'precio-asc': (a, b) => a.precio - b.precio,
            'precio-desc': (a, b) => b.precio - a.precio,
            'nombre': (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        };
        return lista.sort(orden[filtro.orden]);
    }

    function productCard(p) {
        const cat = catOf(p);
        const agotado = p.stock <= 0;
        const fav = favs.includes(p.id);
        return `
            <article class="card${agotado ? ' is-out' : ''}" data-id="${p.id}">
                <button class="fav${fav ? ' active' : ''}" data-fav="${p.id}" aria-label="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${fav}">${icon('heart')}</button>
                <button class="thumb" data-open="${p.id}" aria-label="Ver ${esc(p.nombre)}">
                    ${visual(p)}
                    ${agotado ? '<span class="tag tag-out">Agotado</span>' : (p.etiqueta ? `<span class="tag">${esc(p.etiqueta)}</span>` : '')}
                </button>
                <div class="card-body">
                    <span class="card-cat">${esc(cat.nombre)}</span>
                    <h3><button data-open="${p.id}">${esc(p.nombre)}</button></h3>
                    <p class="card-specs">${p.specs.slice(0, 3).map(esc).join(' · ')}</p>
                    <div class="card-foot">
                        <div class="price">
                            ${p.precioAntes ? `<s>${money(p.precioAntes)}</s>` : ''}
                            <strong>${money(p.precio)}</strong>
                        </div>
                        <button class="add" data-add="${p.id}" ${agotado ? 'disabled' : ''} aria-label="Agregar ${esc(p.nombre)} al carrito">${icon('plus')}</button>
                    </div>
                </div>
            </article>`;
    }

    function renderProducts() {
        const lista = productosFiltrados();
        $('#productGrid').innerHTML = lista.map(productCard).join('');
        $('#emptyState').hidden = lista.length > 0;
        $('#emptyState').textContent = filtro.categoria === 'favoritos' && !filtro.q
            ? 'Aún no tienes favoritos. Toca el corazón de un producto para guardarlo.'
            : 'No encontramos productos con ese filtro.';
        $('#resultCount').textContent = `${lista.length} ${lista.length === 1 ? 'producto' : 'productos'}`;
    }

    function setCategoria(slug) {
        filtro.categoria = slug;
        renderChips();
        renderProducts();
    }

    /* ---------- Detalle de producto ---------- */
    function openProduct(id) {
        const p = byId(id);
        if (!p) return;
        const cat = catOf(p);
        const agotado = p.stock <= 0;
        const modal = $('#productModal');
        modal.innerHTML = `
            <button class="icon-btn modal-close" data-close aria-label="Cerrar">${icon('x')}</button>
            <div class="modal-thumb">${visual(p)}</div>
            <div class="modal-info">
                <span class="card-cat">${esc(cat.nombre)}</span>
                <h2>${esc(p.nombre)}</h2>
                <p>${esc(p.descripcion)}</p>
                <ul class="spec-list">${p.specs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
                <div class="price price-lg">
                    ${p.precioAntes ? `<s>${money(p.precioAntes)}</s>` : ''}
                    <strong>${money(p.precio)}</strong>
                </div>
                <p class="stock ${agotado ? 'out' : ''}">${agotado ? 'Agotado por ahora' : `En stock: ${p.stock} unidades`}</p>
                <div class="btn-row">
                    <button class="btn btn-solid" data-add="${p.id}" ${agotado ? 'disabled' : ''}>Agregar al carrito</button>
                    <a class="btn btn-line" target="_blank" rel="noopener" href="${esc(waUrl(`Hola, quisiera información sobre: ${p.nombre} (${money(p.precio)})`))}">Consultar</a>
                </div>
            </div>`;
        modal.showModal();
    }

    /* ---------- Favoritos ---------- */
    function toggleFav(id) {
        id = Number(id);
        const era = favs.includes(id);
        favs = era ? favs.filter((f) => f !== id) : favs.concat(id);
        store.set('ciap_favs', favs);
        updateCounts();
        renderProducts();
        toast(era ? 'Quitado de favoritos' : 'Guardado en favoritos');
    }

    /* ---------- Carrito ---------- */
    const cartLines = () => Object.keys(cart).map((id) => ({ p: byId(id), qty: cart[id] })).filter((l) => l.p);
    const cartTotal = () => cartLines().reduce((t, l) => t + l.p.precio * l.qty, 0);

    function saveCart() {
        store.set('ciap_cart', cart);
        updateCounts();
        renderCart();
    }

    function addToCart(id) {
        const p = byId(id);
        if (!p || p.stock <= 0) return;
        const actual = cart[p.id] || 0;
        if (actual >= p.stock) { toast('No hay más unidades en stock'); return; }
        cart[p.id] = actual + 1;
        saveCart();
        toast('Agregado al carrito');
    }

    function setQty(id, qty) {
        const p = byId(id);
        if (!p) return;
        if (qty <= 0) delete cart[p.id];
        else cart[p.id] = Math.min(qty, p.stock);
        saveCart();
    }

    function updateCounts() {
        const n = cartLines().reduce((t, l) => t + l.qty, 0);
        $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
        $$('[data-fav-count]').forEach((el) => { el.textContent = favs.length; el.hidden = favs.length === 0; });
    }

    function renderCart() {
        const lines = cartLines();
        $('#cartFoot').hidden = lines.length === 0;
        $('#cartSubtotal').textContent = money(cartTotal());
        $('#cartItems').innerHTML = lines.length === 0
            ? `<div class="cart-empty">${icon('cart')}<p>Tu carrito está vacío.</p></div>`
            : lines.map(({ p, qty }) => `
                <div class="cart-item">
                    <div class="cart-thumb">${visual(p)}</div>
                    <div class="cart-info">
                        <strong>${esc(p.nombre)}</strong>
                        <span class="muted">${money(p.precio)}</span>
                        <div class="qty">
                            <button data-qty="${p.id}" data-delta="-1" aria-label="Restar">${icon('minus')}</button>
                            <span>${qty}</span>
                            <button data-qty="${p.id}" data-delta="1" aria-label="Sumar" ${qty >= p.stock ? 'disabled' : ''}>${icon('plus')}</button>
                        </div>
                    </div>
                    <button class="icon-btn" data-remove="${p.id}" aria-label="Quitar ${esc(p.nombre)}">${icon('trash')}</button>
                </div>`).join('');
    }

    function openCart() {
        $('#cartDrawer').classList.add('open');
        $('#cartDrawer').setAttribute('aria-hidden', 'false');
        $('#backdrop').hidden = false;
    }
    function closeCart() {
        $('#cartDrawer').classList.remove('open');
        $('#cartDrawer').setAttribute('aria-hidden', 'true');
        $('#backdrop').hidden = true;
    }

    /* ---------- Servidor ---------- */
    async function api(ruta, datos) {
        const res = await fetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
        const json = await res.json().catch(() => ({}));
        return { status: res.status, ...json };
    }

    // La pestaña de WhatsApp se abre en el mismo clic (si se abre después, el navegador la bloquea)
    // y recibe la dirección cuando el servidor responde.
    function abrirPestana() {
        const w = window.open('about:blank', '_blank');
        return (url) => {
            if (w && !w.closed) w.location.href = url;
            else location.href = url;
        };
    }

    async function checkout() {
        const lines = cartLines();
        if (!lines.length) return;
        const btn = $('#btnCheckout');
        const irA = abrirPestana();
        btn.disabled = true;

        // El pedido queda registrado en la base de datos; si el servidor no responde, igual se envía por WhatsApp
        let pedido = {};
        try {
            pedido = await api('api/pedidos', { items: lines.map((l) => ({ id: l.p.id, qty: l.qty })) });
        } catch (e) { /* sin conexión con el servidor */ }
        btn.disabled = false;

        if (pedido.status === 422) {
            irA('about:blank');
            toast(pedido.error || 'Revisa tu carrito');
            return;
        }
        const texto = [pedido.folio ? `Hola, quiero hacer este pedido (${pedido.folio}):` : 'Hola, quiero hacer este pedido:', '']
            .concat(lines.map((l) => `• ${l.qty} x ${l.p.nombre} — ${money(l.p.precio * l.qty)}`))
            .concat(['', `Total: ${money(cartTotal())}`]).join('\n');
        irA(waUrl(texto));
        if (pedido.folio) {
            cart = {};
            saveCart();
            closeCart();
            toast(`Pedido ${pedido.folio} registrado`);
        }
    }

    /* ---------- Eventos ---------- */
    function bind() {
        window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
        window.addEventListener('resize', closeMenu);

        $('#btnMenu').addEventListener('click', toggleMenu);
        $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
        $('#btnCart').addEventListener('click', openCart);
        $('#btnCartClose').addEventListener('click', closeCart);
        $('#backdrop').addEventListener('click', closeCart);
        $('#btnCheckout').addEventListener('click', checkout);
        $('#btnSearch').addEventListener('click', () => { go('productos'); $('#searchInput').focus(); });
        $('#btnFavs').addEventListener('click', () => { setCategoria('favoritos'); go('productos'); });

        $('#searchInput').addEventListener('input', (e) => { filtro.q = e.target.value; renderProducts(); });
        $('#sortSelect').addEventListener('change', (e) => { filtro.orden = e.target.value; renderProducts(); });
        $('#chips').addEventListener('click', (e) => {
            const chip = e.target.closest('[data-cat]');
            if (chip) setCategoria(chip.dataset.cat);
        });
        $('#catTiles').addEventListener('click', (e) => {
            const tile = e.target.closest('[data-cat]');
            if (!tile) return;
            filtro.q = '';
            $('#searchInput').value = '';
            setCategoria(tile.dataset.cat);
            go('productos');
        });

        // Acciones delegadas: sirven para las tarjetas, el detalle y el carrito
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-add],[data-fav],[data-open],[data-close],[data-qty],[data-remove],[data-service]');
            if (!el) return;
            const d = el.dataset;
            if (d.add) addToCart(d.add);
            else if (d.fav) toggleFav(d.fav);
            else if (d.open) openProduct(d.open);
            else if ('close' in d) $('#productModal').close();
            else if (d.qty) setQty(d.qty, (cart[d.qty] || 0) + Number(d.delta));
            else if (d.remove) setQty(d.remove, 0);
            else if (d.service) {
                const s = T.servicios.find((x) => x.id === d.service);
                $('#fAsunto').value = 'Servicio: ' + s.nombre;
                go('contacto');
                $('#fNombre').focus();
            }
        });

        // Clic fuera del detalle lo cierra
        $('#productModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); closeMenu(); } });

        $('#contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = new FormData(e.target);
            const texto = [
                `Hola, soy ${f.get('nombre').trim()}.`,
                `Asunto: ${f.get('asunto')}`,
                f.get('telefono').trim() ? `Teléfono: ${f.get('telefono').trim()}` : '',
                '',
                f.get('mensaje').trim(),
            ].filter((l, i) => l !== '' || i === 3).join('\n');
            window.open(waUrl(texto), '_blank', 'noopener');
            // Además del WhatsApp, el mensaje queda guardado en la base de datos
            api('api/mensajes', Object.fromEntries(f)).catch(() => {});
            e.target.reset();
            toast('Abriendo WhatsApp para enviar tu mensaje');
        });
    }

    /* ---------- Inicio ---------- */
    async function init() {
        const res = await fetch('api/tienda');
        if (!res.ok) throw new Error('api/tienda respondió ' + res.status);
        T = await res.json();

        // Los datos vienen de la base: se completan los campos que falten
        T.productos.forEach((p) => {
            p.id = Number(p.id);
            p.precio = Number(p.precio) || 0;
            p.stock = Number(p.stock) || 0;
            p.descripcion = p.descripcion || '';
            p.specs = Array.isArray(p.specs) ? p.specs : [];
        });
        T.servicios.forEach((s) => { s.incluye = Array.isArray(s.incluye) ? s.incluye : []; });
        catMap = Object.fromEntries(T.categorias.map((c) => [c.slug, c]));

        renderStatic();
        renderServices();
        renderChips();
        renderProducts();
        renderCart();
        updateCounts();
        bind();
        showView(location.hash.slice(1));
    }

    init().catch((err) => {
        console.error(err);
        document.querySelector('.stage').innerHTML =
            '<p class="load-error">No se pudo cargar la tienda. Recarga la página en unos segundos.</p>';
    });
})();
