/* =========================================================
   ESPUMAR — Panel de administración
   Secciones: Resumen · Pedidos · Catálogo · Información · Usuarios · Mi cuenta
   ========================================================= */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

const ESTADOS = ['Nuevo', 'Cotizado', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];
const LINE_ORDER = ['auto', 'hogar', 'ropa', 'personal'];
const SPACES = [
  ['cocina', 'Cocina'], ['bano', 'Baño'], ['pisos', 'Pisos y superficies'], ['vidrios', 'Vidrios y espejos'],
  ['ropa', 'Ropa'], ['auto-ext', 'Auto por fuera'], ['auto-int', 'Auto por dentro'], ['motor', 'Motor'], ['personal', 'Manos y cabello']
];
const NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'i-home', roles: ['admin', 'editor', 'ventas'] },
  { id: 'pedidos', label: 'Pedidos', icon: 'i-bag', roles: ['admin', 'editor', 'ventas'] },
  { id: 'catalogo', label: 'Catálogo', icon: 'i-box', roles: ['admin', 'editor'] },
  { id: 'info', label: 'Información', icon: 'i-info', roles: ['admin', 'editor'] },
  { id: 'usuarios', label: 'Usuarios', icon: 'i-users', roles: ['admin'] },
  { id: 'cuenta', label: 'Mi cuenta', icon: 'i-user', roles: ['admin', 'editor', 'ventas'] }
];

const S = {
  user: null, roles: {},
  orders: null, catalog: null, catalogEtag: null, config: null, configEtag: null, users: null,
  filtro: 'Todos', q: '', catTab: 'productos', catLine: 'all'
};

/* ---------- API ---------- */
async function api(path, { method = 'GET', body, raw, type } = {}) {
  const headers = { 'X-Espumar': '1' };
  if (raw) headers['Content-Type'] = type;
  else if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/${path}`, {
    method, headers, credentials: 'same-origin',
    body: raw || (body !== undefined ? JSON.stringify(body) : undefined)
  });
  let data = {};
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    if (res.status === 401 && S.user) { S.user = null; showAuth({ hasUsers: true }, 'Tu sesión terminó. Inicia sesión de nuevo.'); }
    throw err;
  }
  return data;
}

/* ---------- Utilidades ---------- */
const fmtDate = iso => iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtShort = iso => {
  if (!iso) return '—';
  const d = new Date(iso), diff = (Date.now() - d) / 60000;
  if (diff < 1) return 'hace un momento';
  if (diff < 60) return `hace ${Math.round(diff)} min`;
  if (diff < 1440) return `hace ${Math.round(diff / 60)} h`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};
const can = roles => roles.includes(S.user?.rol);
const pieces = o => o.items.reduce((n, i) => n + i.cantidad, 0);
const clone = o => JSON.parse(JSON.stringify(o));
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'producto';
const splitList = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const imgSrc = u => (u && u.startsWith('img/') ? '/' + u : u);

function toast(msg, isError = false) {
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.style.background = isError ? '#b42318' : '';
  t.hidden = false;
  const host = $('dialog[open] .sheet-inner') || document.body;
  if (t.parentElement !== host) host.append(t);
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

function randomPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map(x => abc[x % abc.length]).join('');
}

// Reduce y convierte la imagen a WebP en el navegador antes de subirla (≈100 KB)
async function compressImage(file, max = 1000) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob;
}

async function uploadImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.');
  const blob = await compressImage(file);
  const { url } = await api('admin/upload', { method: 'POST', raw: blob, type: blob.type });
  return url;
}

/* ---------- Hoja (diálogo) ---------- */
const sheet = $('#sheet');
function openSheet({ title, badge = '', body, foot = '' }) {
  $('#sheetTitle').textContent = title;
  $('#sheetBadge').textContent = badge;
  $('#sheetBadge').hidden = !badge;
  $('#sheetBody').innerHTML = body;
  $('#sheetFoot').innerHTML = foot;
  $('#sheetFoot').hidden = !foot;
  sheet.onclick = null;
  sheet.onchange = null;
  sheet.onsubmit = null;
  if (!sheet.open) sheet.showModal();
  $('#sheetBody').scrollTop = 0;
  return sheet;
}
sheet.addEventListener('click', e => {
  if (e.target === sheet || e.target.closest('[data-close]')) sheet.close();
});

/* ---------- Acceso ---------- */
async function boot() {
  try {
    const me = await api('auth/me');
    S.user = me.user;
    S.roles = me.roles;
    showApp();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      const st = await api('auth/status').catch(() => ({ hasUsers: true }));
      showAuth(st);
    } else {
      showAuth({ hasUsers: true }, 'No se pudo conectar con el servidor. Revisa tu conexión y recarga.');
    }
  }
}

function showAuth(st, notice = '') {
  $('#app').hidden = true;
  const box = $('#auth');
  box.hidden = false;
  const brand = `<div class="auth-brand"><img src="/img/logo-espumar-96.webp" alt=""><span>ESPUMAR</span></div>`;
  if (!st.hasUsers) {
    box.innerHTML = `<div class="auth-card">${brand}
      <h1>Configuración inicial</h1>
      <p>Crea la cuenta del primer administrador. Necesitas el código de configuración del proyecto.</p>
      ${st.setupEnabled ? `<form id="setupForm" novalidate>
        <label class="field"><span>Código de configuración</span><input type="password" name="codigo" autocomplete="off" required></label>
        <label class="field"><span>Tu nombre</span><input type="text" name="nombre" autocomplete="name" maxlength="60"></label>
        <label class="field"><span>Usuario</span><input type="text" name="usuario" autocomplete="username" required maxlength="30" autocapitalize="none"><small class="hint">3 a 30 caracteres: letras, números, punto o guion.</small></label>
        <label class="field"><span>Contraseña</span><input type="password" name="contrasena" autocomplete="new-password" required minlength="8"><small class="hint">Mínimo 8 caracteres.</small></label>
        <p class="form-error" hidden></p>
        <button class="btn btn-primary" type="submit">Crear administrador</button>
      </form>` : `<p class="form-error">La configuración inicial está desactivada. Agrega la variable SETUP_CODE en Vercel.</p>`}
    </div>`;
    $('#setupForm')?.addEventListener('submit', e => submitAuth(e, 'auth/setup'));
  } else {
    box.innerHTML = `<div class="auth-card">${brand}
      <h1>Panel de administración</h1>
      <p>Inicia sesión para gestionar pedidos, catálogo e información del sitio.</p>
      <form id="loginForm" novalidate>
        <label class="field"><span>Usuario</span><input type="text" name="usuario" autocomplete="username" required autocapitalize="none"></label>
        <label class="field"><span>Contraseña</span><input type="password" name="contrasena" autocomplete="current-password" required></label>
        <p class="form-error" ${notice ? '' : 'hidden'}>${esc(notice)}</p>
        <button class="btn btn-primary" type="submit">Iniciar sesión</button>
      </form>
    </div>`;
    $('#loginForm').addEventListener('submit', e => submitAuth(e, 'auth/login'));
  }
  $('input', box)?.focus();
}

async function submitAuth(e, path) {
  e.preventDefault();
  const form = e.target;
  const btn = $('button[type="submit"]', form);
  const err = $('.form-error', form);
  err.hidden = true;
  btn.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(form));
    const res = await api(path, { method: 'POST', body });
    S.user = res.user;
    const me = await api('auth/me');
    S.roles = me.roles;
    showApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Aplicación ---------- */
function showApp() {
  $('#auth').hidden = true;
  $('#app').hidden = false;
  const initials = (S.user.nombre || S.user.usuario).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  $('#userChip').textContent = initials;
  $('#userChip').title = `${S.user.nombre || S.user.usuario} · ${S.roles[S.user.rol] || S.user.rol}`;
  $('#nav').innerHTML = NAV.filter(n => can(n.roles))
    .map(n => `<a href="#${n.id}" data-nav="${n.id}">${ico(n.icon)}<span>${n.label}</span></a>`).join('');
  route();
}

window.addEventListener('hashchange', () => { if (S.user) route(); });

async function route() {
  let id = location.hash.slice(1) || 'resumen';
  const item = NAV.find(n => n.id === id);
  if (!item || !can(item.roles)) id = 'resumen';
  $$('#nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === id));
  $$('#nav a').forEach(a => { if (a.dataset.nav === id) a.setAttribute('aria-current', 'page'); });
  const view = $('#view');
  view.innerHTML = '<p class="loading">Cargando…</p>';
  try {
    await VIEWS[id].load?.();
    VIEWS[id].render(view);
  } catch (err) {
    if (err.status !== 401) view.innerHTML = `<div class="empty">No se pudo cargar esta sección: ${esc(err.message)}<br><br><button class="btn btn-outline btn-sm" type="button" onclick="location.reload()">Reintentar</button></div>`;
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

const loadOrders = async (force) => { if (force || !S.orders) S.orders = (await api('admin/orders')).orders; };
const loadCatalog = async (force) => { if (force || !S.catalog) { const r = await api('admin/catalog'); S.catalog = r.catalog; S.catalogEtag = r.etag; } };
const loadConfig = async (force) => { if (force || !S.config) { const r = await api('admin/config'); S.config = r.config; S.configEtag = r.etag; } };
const loadUsers = async (force) => { if (force || !S.users) S.users = (await api('admin/users')).users; };

const statusBadge = e => `<span class="status st-${esc(e)}">${esc(e)}</span>`;

/* =========================================================
   VISTAS
   ========================================================= */
const VIEWS = {};

/* ---------- Resumen ---------- */
VIEWS.resumen = {
  load: () => Promise.all([loadOrders(), loadCatalog()]),
  render(view) {
    const o = S.orders;
    const count = e => o.filter(x => x.estado === e).length;
    const proceso = count('Cotizado') + count('Pagado') + count('Enviado');
    const month = new Date().toISOString().slice(0, 7);
    const entregadosMes = o.filter(x => x.estado === 'Entregado' && x.fecha.startsWith(month)).length;
    const visibles = S.catalog.products.filter(p => p.active).length;

    const tally = {};
    o.filter(x => x.estado !== 'Cancelado').forEach(x => x.items.forEach(i => { tally[i.producto] = (tally[i.producto] || 0) + i.cantidad; }));
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = top[0]?.[1] || 1;

    view.innerHTML = `
      <div class="view-head"><h1>Hola, ${esc((S.user.nombre || S.user.usuario).split(' ')[0])}</h1>
        <button class="btn btn-outline btn-sm" type="button" data-action="refresh">${ico('i-refresh')} Actualizar</button></div>
      <div class="kpis">
        <a class="kpi ${count('Nuevo') ? 'is-alert' : ''}" href="#pedidos" data-filter="Nuevo"><strong>${count('Nuevo')}</strong><span>Pedidos nuevos</span></a>
        <a class="kpi" href="#pedidos" data-filter="Todos"><strong>${proceso}</strong><span>En proceso</span></a>
        <a class="kpi" href="#pedidos" data-filter="Entregado"><strong>${entregadosMes}</strong><span>Entregados este mes</span></a>
        <div class="kpi"><strong>${visibles}<small class="muted" style="font-size:.9rem"> / ${S.catalog.products.length}</small></strong><span>Productos visibles</span></div>
      </div>
      <div class="dash-grid">
        <section class="panel">
          <h2>Últimos pedidos</h2>
          ${o.length ? `<div class="rows">${o.slice(0, 5).map(orderRow).join('')}</div>` : '<p class="muted small">Aún no hay pedidos. Aparecerán aquí cuando un cliente envíe su cotización desde la web.</p>'}
        </section>
        <section class="panel">
          <h2>Productos más pedidos</h2>
          ${top.length ? `<div class="bars">${top.map(([name, n]) => `
            <div class="bar-row"><div class="bar-label"><span>${esc(name)}</span><b>${n} pzas</b></div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(n / max * 100)}%"></div></div></div>`).join('')}</div>`
            : '<p class="muted small">Se calculará con los pedidos recibidos (sin contar cancelados).</p>'}
        </section>
      </div>`;
    view.onclick = e => {
      const k = e.target.closest('[data-filter]');
      if (k) S.filtro = k.dataset.filter;
      if (e.target.closest('[data-action="refresh"]')) { S.orders = null; S.catalog = null; route(); }
      const row = e.target.closest('[data-folio]');
      if (row) openOrder(row.dataset.folio);
    };
  }
};

function orderRow(o) {
  const items = o.items.slice(0, 2).map(i => `${i.cantidad} × ${i.producto}`).join(', ') + (o.items.length > 2 ? '…' : '');
  return `<button class="row" type="button" data-folio="${esc(o.folio)}">
    <span class="avatar" aria-hidden="true">${esc((o.nombre || '?').charAt(0).toUpperCase())}</span>
    <span class="row-main">
      <span class="row-title">${esc(o.nombre || 'Sin nombre')} <span class="muted small">· ${esc(o.folio)}</span></span>
      <span class="row-sub">${esc(items)}</span>
      <span class="row-sub">${fmtShort(o.fecha)} · ${pieces(o)} pzas${o.tipo ? ' · ' + esc(o.tipo) : ''}</span>
    </span>
    <span class="row-side">${statusBadge(o.estado)}</span>
  </button>`;
}

/* ---------- Pedidos ---------- */
VIEWS.pedidos = {
  load: () => loadOrders(),
  render(view) {
    view.innerHTML = `
      <div class="view-head"><h1>Pedidos</h1>
        <button class="btn btn-outline btn-sm" type="button" data-action="refresh">${ico('i-refresh')} Actualizar</button></div>
      <div class="toolbar">
        <label class="search">${ico('i-search')}<input type="search" placeholder="Buscar por folio, nombre o producto" value="${esc(S.q)}" data-action="search" aria-label="Buscar pedidos"></label>
      </div>
      <div class="chip-row" role="group" aria-label="Filtrar por estado" id="estadoChips"></div>
      <div class="rows" id="orderList" style="margin-top:.9rem"></div>`;
    this.paint();
    view.onclick = e => {
      if (e.target.closest('[data-action="refresh"]')) { loadOrders(true).then(() => this.paint()).then(() => toast('Pedidos actualizados')); return; }
      const chip = e.target.closest('[data-estado]');
      if (chip) { S.filtro = chip.dataset.estado; this.paint(); return; }
      const row = e.target.closest('[data-folio]');
      if (row) openOrder(row.dataset.folio);
    };
    view.oninput = e => {
      if (e.target.matches('[data-action="search"]')) { S.q = e.target.value; this.paint(); }
    };
  },
  paint() {
    const o = S.orders;
    const n = e => e === 'Todos' ? o.length : o.filter(x => x.estado === e).length;
    $('#estadoChips').innerHTML = ['Todos', ...ESTADOS].map(e =>
      `<button type="button" class="chip" data-estado="${e}" aria-pressed="${S.filtro === e}">${e}<small>${n(e)}</small></button>`).join('');
    const q = S.q.trim().toLowerCase();
    const list = o.filter(x => (S.filtro === 'Todos' || x.estado === S.filtro) &&
      (!q || [x.folio, x.nombre, ...x.items.map(i => i.producto)].join(' ').toLowerCase().includes(q)));
    $('#orderList').innerHTML = list.length ? list.map(orderRow).join('')
      : `<div class="empty">${o.length ? 'No hay pedidos con ese filtro.' : 'Aún no hay pedidos. Aparecerán aquí cuando un cliente envíe su cotización desde la web.'}</div>`;
  }
};

function openOrder(folio) {
  const o = S.orders.find(x => x.folio === folio);
  if (!o) return;
  const body = `
    <form id="orderForm" class="form-grid">
      <dl class="info-grid">
        <div><dt>Fecha</dt><dd>${fmtDate(o.fecha)}</dd></div>
        <div><dt>Cliente</dt><dd>${esc(o.nombre || 'Sin nombre')}</dd></div>
        <div><dt>Compra para</dt><dd>${esc(o.tipo || '—')}</dd></div>
        <div><dt>Promociones</dt><dd>${o.promos ? 'Sí acepta' : 'No'}</dd></div>
      </dl>
      <section><h3 class="small muted" style="margin-bottom:.4rem">PRODUCTOS · ${pieces(o)} PIEZAS</h3>
        <ul class="item-list">${o.items.map(i => `<li><span>${esc(i.producto)}<br><span class="muted small">${esc([i.linea, i.presentacion, i.aroma].filter(Boolean).join(' · '))}</span></span><b>× ${i.cantidad}</b></li>`).join('')}</ul>
      </section>
      ${o.notas ? `<section><h3 class="small muted" style="margin-bottom:.4rem">NOTAS DEL CLIENTE</h3><p class="privacy-note" style="font-size:.9rem;color:var(--dark)">${esc(o.notas)}</p></section>` : ''}
      <fieldset class="field"><legend>Estado del pedido</legend>
        <div class="est-grid">${ESTADOS.map(e => `<label><input type="radio" name="estado" value="${e}" ${o.estado === e ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div>
      </fieldset>
      <label class="field"><span>Seguimiento interno <small>(solo lo ve el equipo)</small></span>
        <textarea name="seguimiento" rows="3" maxlength="1000" placeholder="Precio cotizado, fecha de entrega, quién lo atiende…">${esc(o.seguimiento || '')}</textarea></label>
      <section><h3 class="small muted" style="margin-bottom:.4rem">HISTORIAL</h3>
        <ul class="history">${(o.historial || []).slice().reverse().map(h => `<li>${statusBadge(h.estado)} ${fmtDate(h.fecha)} · ${esc(h.por)}</li>`).join('')}</ul>
      </section>
    </form>`;
  const foot = `${can(['admin']) ? '<button class="btn btn-outline btn-danger" type="button" data-action="delete">Eliminar</button>' : ''}
    <button class="btn btn-outline" type="button" data-action="copy">Copiar folio</button>
    <button class="btn btn-primary" type="button" data-action="save">Guardar</button>`;
  const d = openSheet({ title: o.folio, badge: o.estado, body, foot });
  d.onclick = async e => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (!act) return;
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(o.folio); toast('Folio copiado'); } catch { toast(o.folio); }
    }
    if (act === 'save') {
      const f = new FormData($('#orderForm'));
      try {
        const { order } = await api('admin/orders', { method: 'PATCH', body: { folio: o.folio, estado: f.get('estado'), seguimiento: f.get('seguimiento') } });
        Object.assign(o, order);
        d.close();
        toast(`Pedido ${o.folio} actualizado`);
        route();
      } catch (err) { toast(err.message, true); }
    }
    if (act === 'delete' && confirm(`¿Eliminar definitivamente el pedido ${o.folio}? Esta acción no se puede deshacer.`)) {
      try {
        await api(`admin/orders?folio=${encodeURIComponent(o.folio)}`, { method: 'DELETE' });
        S.orders = S.orders.filter(x => x.folio !== o.folio);
        d.close();
        toast('Pedido eliminado');
        route();
      } catch (err) { toast(err.message, true); }
    }
  };
}

/* ---------- Catálogo ---------- */
async function saveCatalog(mutate, okMsg) {
  const next = clone(S.catalog);
  mutate(next);
  try {
    const r = await api('admin/catalog', { method: 'PUT', body: { catalog: next, etag: S.catalogEtag } });
    S.catalog = r.catalog;
    S.catalogEtag = r.etag;
    toast(okMsg);
    return true;
  } catch (err) {
    if (err.status === 409) { await loadCatalog(true); toast('Otra persona cambió el catálogo. Se recargó; revisa y vuelve a intentar.', true); }
    else toast(err.message, true);
    return false;
  } finally {
    if (location.hash.slice(1) === 'catalogo') VIEWS.catalogo.paint();
  }
}

VIEWS.catalogo = {
  load: () => loadCatalog(),
  render(view) {
    view.innerHTML = `
      <div class="view-head"><h1>Catálogo</h1>
        <button class="btn btn-primary btn-sm" type="button" data-action="new">${ico('i-plus')} Nuevo producto</button></div>
      <div class="tab-list" role="tablist" style="max-width:360px;margin-bottom:1rem">
        <button class="tab" type="button" role="tab" data-tab="productos">Productos</button>
        <button class="tab" type="button" role="tab" data-tab="lineas">Líneas</button>
      </div>
      <div id="catBody"></div>`;
    this.paint();
    view.onclick = e => this.click(e);
    view.onchange = e => this.change(e);
  },
  paint() {
    const body = $('#catBody');
    if (!body) return;
    $$('[data-tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === S.catTab));
    $('[data-action="new"]').hidden = S.catTab !== 'productos';
    const { lines, products } = S.catalog;
    if (S.catTab === 'lineas') {
      body.innerHTML = `<div class="rows cols-2">${LINE_ORDER.map(k => `
        <form class="panel form-grid" data-line-form="${k}" data-line="${k}">
          <div class="img-field">
            ${lines[k].img ? `<img class="img-preview" src="${esc(imgSrc(lines[k].img))}" alt="">` : `<span class="img-preview">${ico('i-image')}</span>`}
            <div class="img-actions">
              <strong>${esc(lines[k].name)}</strong>
              <label class="btn btn-outline btn-sm">${ico('i-image')} Cambiar imagen<input type="file" accept="image/*" data-line-img="${k}"></label>
            </div>
          </div>
          <label class="field"><span>Nombre</span><input type="text" name="name" value="${esc(lines[k].name)}" maxlength="40" required></label>
          <label class="field"><span>Etiqueta</span><input type="text" name="badge" value="${esc(lines[k].badge)}" maxlength="20"></label>
          <label class="field"><span>Descripción en la tarjeta</span><textarea name="desc" rows="3" maxlength="200">${esc(lines[k].desc)}</textarea></label>
          <button class="btn btn-primary btn-sm" type="button" data-save-line="${k}">Guardar línea</button>
        </form>`).join('')}</div>
        <p class="panel-note">Las imágenes se usan en las tarjetas del catálogo y en el carrusel de inicio. Se reducen automáticamente antes de subirlas.</p>`;
      return;
    }
    const chips = ['all', ...LINE_ORDER].map(k => `<button type="button" class="chip" data-cat-line="${k}" aria-pressed="${S.catLine === k}">${k === 'all' ? 'Todas' : esc(lines[k].badge || lines[k].name)}<small>${k === 'all' ? products.length : products.filter(p => p.line === k).length}</small></button>`).join('');
    const list = products.filter(p => S.catLine === 'all' || p.line === S.catLine);
    body.innerHTML = `<div class="chip-row" role="group" aria-label="Filtrar por línea">${chips}</div>
      <div class="rows" style="margin-top:.9rem">${list.map(p => {
        const same = products.filter(x => x.line === p.line);
        const pos = same.indexOf(p);
        return `<div class="row ${p.active ? '' : 'is-off'}" data-line="${p.line}">
          ${p.img ? `<img class="thumb" src="${esc(imgSrc(p.img))}" alt="" loading="lazy">` : `<span class="thumb">${ico('i-' + p.line)}</span>`}
          <span class="row-main">
            <span class="row-title">${esc(p.name)}</span>
            <span class="row-sub">${esc(lines[p.line].badge)} · ${esc(p.sizes.join(', '))}</span>
            <span class="row-sub">${p.active ? 'Visible en la web' : 'Oculto en la web'}</span>
          </span>
          <span class="row-side">
            <label class="switch" title="${p.active ? 'Ocultar de la web' : 'Mostrar en la web'}"><input type="checkbox" data-toggle="${esc(p.id)}" ${p.active ? 'checked' : ''} aria-label="Visible en la web: ${esc(p.name)}"><span></span></label>
            <button class="mini-btn" type="button" data-move="${esc(p.id)}" data-dir="-1" aria-label="Subir ${esc(p.name)}" ${pos === 0 ? 'disabled' : ''}>${ico('i-up')}</button>
            <button class="mini-btn" type="button" data-move="${esc(p.id)}" data-dir="1" aria-label="Bajar ${esc(p.name)}" ${pos === same.length - 1 ? 'disabled' : ''}>${ico('i-down')}</button>
            <button class="mini-btn" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">${ico('i-edit')}</button>
          </span>
        </div>`;
      }).join('') || '<div class="empty">No hay productos en esta línea.</div>'}</div>
      <p class="panel-note">El interruptor muestra u oculta el producto en la web. Las flechas cambian su orden dentro de la línea. Los cambios aparecen en la web en menos de un minuto.</p>`;
  },
  async click(e) {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab) { S.catTab = tab.dataset.tab; this.paint(); return; }
    const chip = t.closest('[data-cat-line]');
    if (chip) { S.catLine = chip.dataset.catLine; this.paint(); return; }
    if (t.closest('[data-action="new"]')) { productSheet(null); return; }
    const edit = t.closest('[data-edit]');
    if (edit) { productSheet(S.catalog.products.find(p => p.id === edit.dataset.edit)); return; }
    const mv = t.closest('[data-move]');
    if (mv) {
      const id = mv.dataset.move, dir = Number(mv.dataset.dir);
      await saveCatalog(c => {
        const i = c.products.findIndex(p => p.id === id);
        const line = c.products[i].line;
        let j = i + dir;
        while (j >= 0 && j < c.products.length && c.products[j].line !== line) j += dir;
        if (j >= 0 && j < c.products.length) [c.products[i], c.products[j]] = [c.products[j], c.products[i]];
      }, 'Orden actualizado');
      return;
    }
    const saveLine = t.closest('[data-save-line]');
    if (saveLine) {
      const k = saveLine.dataset.saveLine;
      const f = new FormData($(`[data-line-form="${k}"]`));
      await saveCatalog(c => { Object.assign(c.lines[k], { name: f.get('name'), badge: f.get('badge'), desc: f.get('desc') }); }, `Línea ${f.get('name')} guardada`);
    }
  },
  async change(e) {
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const id = tg.dataset.toggle, on = tg.checked;
      await saveCatalog(c => { c.products.find(p => p.id === id).active = on; }, on ? 'Producto visible en la web' : 'Producto oculto de la web');
      return;
    }
    const li = e.target.closest('[data-line-img]');
    if (li && li.files[0]) {
      const k = li.dataset.lineImg;
      try {
        toast('Subiendo imagen…');
        const url = await uploadImage(li.files[0]);
        await saveCatalog(c => { c.lines[k].img = url; }, 'Imagen de la línea actualizada');
      } catch (err) { toast(err.message, true); }
    }
  }
};

function productSheet(p) {
  const isNew = !p;
  const lines = S.catalog.lines;
  const draft = p ? clone(p) : { id: '', line: S.catLine !== 'all' ? S.catLine : 'hogar', name: '', use: '', sizes: ['1 L'], scents: [], spaces: [], img: '', active: true };
  const imgBox = () => draft.img
    ? `<img class="img-preview" src="${esc(imgSrc(draft.img))}" alt="">`
    : `<span class="img-preview">${ico('i-image')}</span>`;
  const body = `<form id="prodForm" class="form-grid cols-2" novalidate>
      <div class="img-field span-2">
        <span id="imgBox">${imgBox()}</span>
        <div class="img-actions">
          <label class="btn btn-outline btn-sm">${ico('i-image')} Subir imagen<input type="file" accept="image/*" id="prodImg"></label>
          <button class="btn btn-text btn-sm" type="button" data-action="noimg">Quitar imagen</button>
          <small class="muted small">Opcional. Si no hay imagen se muestra el icono de la línea.</small>
        </div>
      </div>
      <label class="field span-2"><span>Nombre</span><input type="text" name="name" value="${esc(draft.name)}" maxlength="80" required></label>
      <label class="field"><span>Línea</span><select name="line">${LINE_ORDER.map(k => `<option value="${k}" ${draft.line === k ? 'selected' : ''}>${esc(lines[k].name)}</option>`).join('')}</select></label>
      <label class="field" style="align-content:end"><span class="check-field"><input type="checkbox" name="active" ${draft.active ? 'checked' : ''}><span class="check-box" aria-hidden="true"><svg class="ico"><use href="#i-check"/></svg></span><span>Visible en la web</span></span></label>
      <label class="field span-2"><span>Para qué sirve <small>(una línea clara)</small></span><textarea name="use" rows="2" maxlength="200">${esc(draft.use)}</textarea></label>
      <label class="field span-2"><span>Presentaciones <small>(separadas por coma)</small></span><input type="text" name="sizes" value="${esc(draft.sizes.join(', '))}" placeholder="1 L, Galón 4 L, Garrafa 20 L"></label>
      <label class="field span-2"><span>Aromas <small>(opcional, separados por coma)</small></span><input type="text" name="scents" value="${esc(draft.scents.join(', '))}" placeholder="Lavanda, Brisa marina"></label>
      <fieldset class="field span-2"><legend>Dónde se usa <small>(guía rápida)</small></legend>
        <div class="check-grid">${SPACES.map(([id, label]) => `<label><input type="checkbox" name="spaces" value="${id}" ${draft.spaces.includes(id) ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>
      </fieldset>
    </form>`;
  const foot = `${!isNew ? '<button class="btn btn-outline btn-danger" type="button" data-action="delete">Eliminar</button>' : ''}
    <button class="btn btn-primary" type="button" data-action="save">${isNew ? 'Agregar producto' : 'Guardar cambios'}</button>`;
  const d = openSheet({ title: isNew ? 'Nuevo producto' : draft.name, badge: isNew ? 'Catálogo' : lines[draft.line].badge, body, foot });

  d.onchange = async e => {
    if (e.target.id === 'prodImg' && e.target.files[0]) {
      try {
        $('#imgBox').innerHTML = '<span class="img-preview small">Subiendo…</span>';
        draft.img = await uploadImage(e.target.files[0]);
        $('#imgBox').innerHTML = imgBox();
      } catch (err) { $('#imgBox').innerHTML = imgBox(); toast(err.message, true); }
    }
  };
  d.onclick = async e => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'noimg') { draft.img = ''; $('#imgBox').innerHTML = imgBox(); }
    if (act === 'save') {
      const f = new FormData($('#prodForm'));
      const item = {
        ...draft,
        name: String(f.get('name')).trim(),
        line: f.get('line'),
        use: String(f.get('use')).trim(),
        sizes: splitList(f.get('sizes')),
        scents: splitList(f.get('scents')),
        spaces: f.getAll('spaces'),
        active: f.get('active') === 'on'
      };
      if (!item.name) { toast('Escribe el nombre del producto.', true); return; }
      if (!item.sizes.length) { toast('Agrega al menos una presentación.', true); return; }
      if (isNew) item.id = `${slug(item.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const ok = await saveCatalog(c => {
        if (isNew) c.products.push(item);
        else c.products[c.products.findIndex(x => x.id === item.id)] = item;
      }, isNew ? 'Producto agregado' : 'Producto actualizado');
      if (ok) d.close();
    }
    if (act === 'delete' && confirm(`¿Eliminar “${draft.name}” del catálogo? Si solo quieres ocultarlo, usa el interruptor de visibilidad.`)) {
      const ok = await saveCatalog(c => { c.products = c.products.filter(x => x.id !== draft.id); }, 'Producto eliminado');
      if (ok) d.close();
    }
  };
}

/* ---------- Información del sitio ---------- */
VIEWS.info = {
  load: () => loadConfig(),
  render(view) {
    const c = S.config;
    view.innerHTML = `
      <div class="view-head"><h1>Información del sitio</h1></div>
      <form class="panel" id="cfgForm" novalidate>
        <div class="form-section">
          <h3>Contacto</h3>
          <div class="form-grid cols-2">
            <label class="field"><span>WhatsApp de pedidos</span><input type="tel" name="whatsapp" value="${esc(c.whatsapp)}" inputmode="numeric" required><small class="hint">Con lada de país, sin espacios. Ej. 527441709130</small></label>
            <label class="field"><span>Teléfono visible</span><input type="text" name="telefono" value="${esc(c.telefono)}" maxlength="25"><small class="hint">Como se muestra en el pie de página.</small></label>
            <label class="field"><span>Instagram</span><input type="text" name="instagram" value="${esc(c.instagram)}" maxlength="30"><small class="hint">Sin @. Ej. espumar.mx</small></label>
            <label class="field"><span>Correo de contacto</span><input type="email" name="email" value="${esc(c.email)}" maxlength="80"></label>
          </div>
        </div>
        <div class="form-section">
          <h3>Portada</h3>
          <div class="form-grid">
            <label class="field"><span>Etiqueta superior</span><input type="text" name="heroPill" value="${esc(c.heroPill)}" maxlength="40"></label>
            <label class="field"><span>Texto bajo el título</span><textarea name="heroSubtitle" rows="2" maxlength="200">${esc(c.heroSubtitle)}</textarea></label>
          </div>
        </div>
        <div class="form-section">
          <h3>Barra de anuncio</h3>
          <p class="muted small">Un aviso corto arriba de la web: promociones, horarios especiales, envíos.</p>
          <label class="check-field"><input type="checkbox" name="anuncioActivo" ${c.anuncio?.activo ? 'checked' : ''}><span class="check-box" aria-hidden="true"><svg class="ico"><use href="#i-check"/></svg></span><span>Mostrar la barra de anuncio</span></label>
          <label class="field"><span>Texto del anuncio</span><input type="text" name="anuncioTexto" value="${esc(c.anuncio?.texto)}" maxlength="140" placeholder="Ej. Envíos gratis en pedidos de negocio esta semana"></label>
        </div>
        <div class="save-bar"><button class="btn btn-primary" type="submit">Guardar información</button></div>
        <p class="panel-note">Los cambios aparecen en la web en menos de un minuto.</p>
      </form>`;
    $('#cfgForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const config = {
        whatsapp: f.get('whatsapp'), telefono: f.get('telefono'), instagram: f.get('instagram'), email: f.get('email'),
        heroPill: f.get('heroPill'), heroSubtitle: f.get('heroSubtitle'),
        anuncio: { activo: f.get('anuncioActivo') === 'on', texto: f.get('anuncioTexto') }
      };
      try {
        const r = await api('admin/config', { method: 'PUT', body: { config, etag: S.configEtag } });
        S.config = r.config;
        S.configEtag = r.etag;
        toast('Información guardada');
      } catch (err) {
        if (err.status === 409) { await loadConfig(true); this.render(view); }
        toast(err.message, true);
      }
    });
  }
};

/* ---------- Usuarios ---------- */
VIEWS.usuarios = {
  load: () => loadUsers(),
  render(view) {
    view.innerHTML = `
      <div class="view-head"><h1>Usuarios</h1>
        <button class="btn btn-primary btn-sm" type="button" data-action="new">${ico('i-plus')} Nuevo usuario</button></div>
      <div class="rows">${S.users.map(u => `
        <button class="row ${u.activo ? '' : 'is-off'}" type="button" data-user="${esc(u.usuario)}">
          <span class="avatar" aria-hidden="true">${esc((u.nombre || u.usuario).charAt(0).toUpperCase())}</span>
          <span class="row-main">
            <span class="row-title">${esc(u.nombre || u.usuario)} ${u.usuario === S.user.usuario ? '<span class="muted small">(tú)</span>' : ''}</span>
            <span class="row-sub">@${esc(u.usuario)} · ${u.activo ? 'Activo' : 'Desactivado'} · Último acceso: ${u.ultimoAcceso ? fmtShort(u.ultimoAcceso) : 'nunca'}</span>
          </span>
          <span class="row-side"><span class="role">${esc(S.roles[u.rol] || u.rol)}</span></span>
        </button>`).join('')}</div>
      <section class="panel" style="margin-top:1rem">
        <h2>Qué puede hacer cada rol</h2>
        <ul class="item-list">
          <li><span><b>Administrador</b></span><span class="muted small">Todo, incluida la gestión de usuarios</span></li>
          <li><span><b>Editor</b></span><span class="muted small">Pedidos, catálogo e información del sitio</span></li>
          <li><span><b>Ventas</b></span><span class="muted small">Solo pedidos</span></li>
        </ul>
      </section>`;
    view.onclick = e => {
      if (e.target.closest('[data-action="new"]')) { userSheet(null); return; }
      const row = e.target.closest('[data-user]');
      if (row) userSheet(S.users.find(u => u.usuario === row.dataset.user));
    };
  }
};

function userSheet(u) {
  const isNew = !u;
  const isSelf = u?.usuario === S.user.usuario;
  const roleOpts = Object.entries(S.roles).map(([k, v]) => `<option value="${k}" ${u?.rol === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const body = `<form id="userForm" class="form-grid" novalidate>
      ${isNew ? `<label class="field"><span>Usuario</span><input type="text" name="usuario" required maxlength="30" autocapitalize="none" autocomplete="off"><small class="hint">Con este nombre inicia sesión. 3 a 30 caracteres.</small></label>` : ''}
      <label class="field"><span>Nombre</span><input type="text" name="nombre" value="${esc(u?.nombre)}" maxlength="60"></label>
      <label class="field"><span>Rol</span><select name="rol" ${isSelf ? 'disabled' : ''}>${roleOpts}</select>${isSelf ? '<small class="hint">No puedes cambiar tu propio rol.</small>' : ''}</label>
      ${!isNew && !isSelf ? `<label class="check-field"><input type="checkbox" name="activo" ${u.activo ? 'checked' : ''}><span class="check-box" aria-hidden="true"><svg class="ico"><use href="#i-check"/></svg></span><span>Usuario activo <small>Si lo desactivas no podrá iniciar sesión.</small></span></label>` : ''}
      <label class="field"><span>${isNew ? 'Contraseña temporal' : 'Nueva contraseña'} ${isNew ? '' : '<small>(déjala vacía para no cambiarla)</small>'}</span>
        <span class="pw-row"><input type="text" name="contrasena" minlength="8" autocomplete="new-password" ${isNew ? 'required' : ''}><button class="btn btn-outline btn-sm" type="button" data-action="gen">Generar</button></span>
        <small class="hint">Compártela por un medio privado y pide que la cambie en “Mi cuenta”.</small></label>
    </form>`;
  const foot = `${!isNew && !isSelf ? '<button class="btn btn-outline btn-danger" type="button" data-action="delete">Eliminar</button>' : ''}
    <button class="btn btn-primary" type="button" data-action="save">${isNew ? 'Crear usuario' : 'Guardar'}</button>`;
  const d = openSheet({ title: isNew ? 'Nuevo usuario' : (u.nombre || u.usuario), badge: isNew ? 'Usuarios' : '@' + u.usuario, body, foot });
  d.onclick = async e => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'gen') $('#userForm [name="contrasena"]').value = randomPassword();
    if (act === 'save') {
      const f = new FormData($('#userForm'));
      const payload = { nombre: f.get('nombre') };
      if (!isSelf) payload.rol = f.get('rol');
      if (f.get('contrasena')) payload.contrasena = f.get('contrasena');
      try {
        if (isNew) {
          payload.usuario = f.get('usuario');
          await api('admin/users', { method: 'POST', body: payload });
        } else {
          payload.usuario = u.usuario;
          if (!isSelf) payload.activo = f.get('activo') === 'on';
          await api('admin/users', { method: 'PATCH', body: payload });
        }
        d.close();
        toast(isNew ? 'Usuario creado' : 'Usuario actualizado');
        await loadUsers(true);
        route();
      } catch (err) { toast(err.message, true); }
    }
    if (act === 'delete' && confirm(`¿Eliminar el usuario @${u.usuario}? Ya no podrá iniciar sesión.`)) {
      try {
        await api(`admin/users?usuario=${encodeURIComponent(u.usuario)}`, { method: 'DELETE' });
        d.close();
        toast('Usuario eliminado');
        await loadUsers(true);
        route();
      } catch (err) { toast(err.message, true); }
    }
  };
}

/* ---------- Mi cuenta ---------- */
VIEWS.cuenta = {
  render(view) {
    view.innerHTML = `
      <div class="view-head"><h1>Mi cuenta</h1></div>
      <section class="panel">
        <dl class="info-grid">
          <div><dt>Nombre</dt><dd>${esc(S.user.nombre || '—')}</dd></div>
          <div><dt>Usuario</dt><dd>@${esc(S.user.usuario)}</dd></div>
          <div><dt>Rol</dt><dd>${esc(S.roles[S.user.rol] || S.user.rol)}</dd></div>
          <div><dt>Último acceso</dt><dd>${fmtDate(S.user.ultimoAcceso)}</dd></div>
        </dl>
      </section>
      <form class="panel form-grid" id="pwForm" novalidate>
        <h2>Cambiar contraseña</h2>
        <label class="field"><span>Contraseña actual</span><input type="password" name="actual" autocomplete="current-password" required></label>
        <label class="field"><span>Nueva contraseña</span><input type="password" name="nueva" autocomplete="new-password" minlength="8" required><small class="hint">Mínimo 8 caracteres. Se cerrarán tus otras sesiones.</small></label>
        <div class="save-bar"><button class="btn btn-primary" type="submit">Actualizar contraseña</button></div>
      </form>
      <section class="panel"><button class="btn btn-outline" type="button" id="logoutBtn">${ico('i-out')} Cerrar sesión</button></section>`;
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('auth/password', { method: 'POST', body: { actual: f.get('actual'), nueva: f.get('nueva') } });
        e.target.reset();
        toast('Contraseña actualizada');
      } catch (err) { toast(err.message, true); }
    });
    $('#logoutBtn').addEventListener('click', async () => {
      await api('auth/logout', { method: 'POST' }).catch(() => {});
      S.user = null;
      Object.assign(S, { orders: null, catalog: null, config: null, users: null });
      location.hash = '';
      showAuth({ hasUsers: true });
    });
  }
};

boot();
