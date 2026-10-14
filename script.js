/* =========================================================
   ESPUMAR — Interactividad
   - Filtro de líneas (base original, ampliado)
   - Hoja de productos por línea + "Mi cotización" → WhatsApp
   - Guía rápida por espacio, carrusel, menú móvil, tabs, scrollspy
   ========================================================= */
document.documentElement.classList.add('js');

let WA_NUMBER = '527441709130';   // se actualiza desde el panel (Información del sitio)
const STORAGE_KEY = 'espumar-cotizacion';

// URL de la App web de Google Apps Script que registra los pedidos en Google Sheets
// (ver google-apps-script/INSTRUCCIONES.md). Si queda vacía, el pedido solo se envía por WhatsApp.
const SHEETS_URL = '';

const LINES = {
  auto:     { name: 'Cuidado Automotriz', badge: 'Auto',     img: 'img/linea-auto.webp' },
  hogar:    { name: 'Cuidado del Hogar',  badge: 'Hogar',    img: 'img/linea-hogar.webp' },
  ropa:     { name: 'Cuidado de la Ropa', badge: 'Textil',   img: 'img/linea-ropa.webp' },
  personal: { name: 'Cuidado Personal',   badge: 'Personal', img: 'img/linea-personal.webp' }
};

const LIQ = ['1 L', 'Galón 4 L', 'Garrafa 20 L'];

const PRODUCTS = [
  // Automotriz
  { id: 'shampoo-cera', line: 'auto', name: 'Shampoo con cera', use: 'Lava y protege la pintura dejando un acabado brillante.', sizes: LIQ, spaces: ['auto-ext'] },
  { id: 'espuma-activa', line: 'auto', name: 'Espuma activa', use: 'Prelavado que afloja polvo y lodo antes del enjuague.', sizes: LIQ, spaces: ['auto-ext'] },
  { id: 'desengrasante-motor', line: 'auto', name: 'Desengrasante para motor', use: 'Retira grasa y aceite del motor y piezas metálicas.', sizes: LIQ, spaces: ['motor'] },
  { id: 'pasta-interiores', line: 'auto', name: 'Pasta para interiores Premium', use: 'Limpia y da brillo a tablero, vinil y plásticos.', sizes: ['250 g', '500 g', '1 kg'], spaces: ['auto-int'] },
  { id: 'aromatizante-auto', line: 'auto', name: 'Aromatizante para auto', use: 'Frescura duradera para la cabina en spray.', sizes: ['120 ml', '250 ml'], scents: ['Brisa marina', 'Vainilla', 'Auto nuevo'], spaces: ['auto-int'] },
  // Hogar
  { id: 'multiusos', line: 'hogar', name: 'Limpiador multiusos', use: 'Para pisos, mesas y superficies. Limpia y aromatiza.', sizes: LIQ, scents: ['Lavanda', 'Brisa marina', 'Cítrico'], spaces: ['cocina', 'bano', 'pisos'] },
  { id: 'desengrasante-sosa', line: 'hogar', name: 'Desengrasante con sosa', use: 'Grasa pesada en estufas, campanas y parrillas. Usar con guantes.', sizes: LIQ, spaces: ['cocina'] },
  { id: 'quita-sarro', line: 'hogar', name: 'Quita sarro', use: 'Elimina sarro y manchas de agua en llaves, regaderas y azulejo.', sizes: LIQ, spaces: ['bano'] },
  { id: 'limpia-vidrios', line: 'hogar', name: 'Limpia vidrios', use: 'Ventanas, espejos y cristales del auto sin dejar marcas.', sizes: ['500 ml', '1 L', 'Galón 4 L'], spaces: ['vidrios', 'auto-int'] },
  { id: 'pastillas-wc', line: 'hogar', name: 'Pastillas para WC', use: 'Mantienen el inodoro limpio y fresco en cada descarga.', sizes: ['Paquete 4 pzas', 'Paquete 12 pzas'], spaces: ['bano'] },
  // Ropa
  { id: 'detergente-blanca', line: 'ropa', name: 'Detergente ropa blanca', use: 'Blancos más brillantes sin maltratar la fibra.', sizes: LIQ, spaces: ['ropa'] },
  { id: 'detergente-color', line: 'ropa', name: 'Detergente ropa de color', use: 'Cuida los colores lavada tras lavada.', sizes: LIQ, spaces: ['ropa'] },
  { id: 'detergente-negra', line: 'ropa', name: 'Detergente ropa negra', use: 'Mantiene el negro intenso y evita el deslavado.', sizes: LIQ, spaces: ['ropa'] },
  { id: 'suavizante', line: 'ropa', name: 'Suavizante concentrado', use: 'Telas suaves y perfumadas; rinde más por medida.', sizes: LIQ, scents: ['Floral', 'Bebé', 'Brisa marina'], spaces: ['ropa'] },
  // Personal
  { id: 'jabon-manos', line: 'personal', name: 'Jabón líquido para manos', use: 'Fórmula humectante con aroma perfumado. Ideal para uso frecuente.', sizes: ['500 ml', '1 L', 'Galón 4 L'], spaces: ['personal', 'bano'] },
  { id: 'shampoo-capilar', line: 'personal', name: 'Shampoo capilar', use: 'Limpieza suave con extractos y fragancia ligera.', sizes: ['500 ml', '1 L'], spaces: ['personal'] }
];

const SPACES = [
  { id: 'cocina',   label: 'Cocina' },
  { id: 'bano',     label: 'Baño' },
  { id: 'pisos',    label: 'Pisos y superficies' },
  { id: 'vidrios',  label: 'Vidrios y espejos' },
  { id: 'ropa',     label: 'Ropa' },
  { id: 'auto-ext', label: 'Auto por fuera' },
  { id: 'auto-int', label: 'Auto por dentro' },
  { id: 'motor',    label: 'Motor' },
  { id: 'personal', label: 'Manos y cabello' }
];

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const byId = id => PRODUCTS.find(p => p.id === id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const waLink = text => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
const isDesktop = () => window.matchMedia('(min-width: 960px)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initFilters();
  initSlider();
  initGuide();
  initTabs();
  initReveal();
  initScrollSpy();
  initSheets();
  initImages();
  initStats();
  Cart.load();
  Cart.render();
  paintCounts();
  loadRemote();
});

// Cuántos productos tiene cada línea
function paintCounts() {
  $$('[data-count]').forEach(el => {
    const n = PRODUCTS.filter(p => p.line === el.dataset.count).length;
    el.textContent = `${n} producto${n === 1 ? '' : 's'}`;
  });
}

/* ---------- Datos del panel de administración ---------- */
// La página se muestra al instante con los datos incluidos; después trae el
// catálogo y la información actualizados desde /api/catalog (en caché del CDN).
async function loadRemote() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) return;
    const { catalog, config } = await res.json();
    if (catalog?.products?.length) applyCatalog(catalog);
    if (config) applyConfig(config);
  } catch { /* sin conexión con la API: se quedan los datos incluidos */ }
}

const imgUrl = u => (u && u.startsWith('img/') ? u : u || '');

function applyCatalog(catalog) {
  for (const [key, l] of Object.entries(catalog.lines || {})) {
    if (!LINES[key]) continue;
    Object.assign(LINES[key], { name: l.name, badge: l.badge, img: imgUrl(l.img) || LINES[key].img });
    const card = $(`.card[data-category="${key}"]`);
    if (card) {
      $('h3', card).textContent = l.name;
      if (l.desc) $('.card-body > p', card).textContent = l.desc;
      const badge = $('.badge', card);
      if (badge && l.badge) badge.lastChild.textContent = l.badge;
      const img = $('.card-media img', card);
      if (img && l.img && img.getAttribute('src') !== imgUrl(l.img)) img.src = imgUrl(l.img);
    }
    const slideImg = $(`.slide[data-open-line="${key}"] img`);
    if (slideImg && l.img && slideImg.getAttribute('src') !== imgUrl(l.img)) slideImg.src = imgUrl(l.img);
  }
  PRODUCTS.splice(0, PRODUCTS.length, ...catalog.products.map(p => ({ ...p, img: imgUrl(p.img) })));
  paintCounts();
  initStats();
  // La guía y el carrito se ajustan a los productos vigentes
  const results = $('#guideResults');
  const chip = $('.chip[aria-pressed="true"]', $('#spaceChips'));
  if (chip) chip.click();
  else if (results) results.innerHTML = '<p class="guide-hint">Elige un espacio para ver la recomendación.</p>';
  Cart.items = Cart.items.filter(i => byId(i.id));
  Cart.save();
  Cart.render();
}

function applyConfig(c) {
  if (/^\d{10,15}$/.test(c.whatsapp || '') && c.whatsapp !== WA_NUMBER) {
    const old = WA_NUMBER;
    WA_NUMBER = c.whatsapp;
    $$(`a[href*="wa.me/${old}"]`).forEach(a => { a.href = a.href.replace(`wa.me/${old}`, `wa.me/${WA_NUMBER}`); });
  }
  if (c.telefono) {
    $$('a[href^="tel:"]').forEach(a => {
      a.href = 'tel:+' + c.telefono.replace(/\D/g, '');
      a.lastChild.textContent = ' ' + c.telefono;
    });
  }
  if (c.instagram) {
    $$('a[href*="instagram.com/"]').forEach(a => {
      a.href = `https://www.instagram.com/${c.instagram}`;
      if (a.lastChild?.nodeType === 3 && a.lastChild.textContent.includes('@')) a.lastChild.textContent = ' @' + c.instagram;
    });
  }
  if (c.heroPill) $('.hero .pill').textContent = c.heroPill;
  if (c.heroSubtitle) $('.hero-text > p').textContent = c.heroSubtitle;
  const bar = $('#announce');
  if (bar && c.anuncio?.activo && c.anuncio.texto) {
    $('#announceText').textContent = c.anuncio.texto;
    bar.hidden = false;
  }
}

/* ---------- Header + menú móvil ---------- */
function initHeader() {
  const header = $('.header');
  const nav = $('#nav');
  const btn = $('.menu-btn');

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setOpen = open => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !e.target.closest('#nav, .menu-btn')) setOpen(false);
  });
}

/* ---------- Filtro de líneas (base del proyecto) ---------- */
function initFilters() {
  const buttons = $$('.filter-btn');
  const cards = $$('.card');
  const status = $('#filterStatus');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filter = btn.dataset.filter;
      let visible = 0;
      cards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !show);
        card.classList.remove('fade-in');
        if (show) {
          visible++;
          void card.offsetWidth; // reinicia la animación
          card.classList.add('fade-in', 'in');
        }
      });
      status.textContent = filter === 'all'
        ? 'Mostrando las 4 líneas'
        : `Mostrando ${visible} línea: ${btn.textContent}`;
    });
  });
}

/* ---------- Carrusel del hero ---------- */
function initSlider() {
  const slider = $('#slider');
  const slides = $$('.slide', slider);
  const dotsWrap = $('#dots');
  let index = 0;
  let timer = null;

  const dots = slides.map((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.setAttribute('aria-label', `Ir a ${s.querySelector('.slide-cap').textContent.trim()}`);
    d.addEventListener('click', () => { go(i); restart(); });
    dotsWrap.append(d);
    return d;
  });

  function paint() {
    const n = slides.length;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === index);
      s.classList.toggle('is-next', i === (index + 1) % n);
      s.classList.toggle('is-prev', i === (index - 1 + n) % n);
      s.tabIndex = i === index ? 0 : -1;
    });
    dots.forEach((d, i) => d.setAttribute('aria-current', i === index));
  }

  function go(i, scroll = true) {
    index = (i + slides.length) % slides.length;
    paint();
    if (scroll && !isDesktop()) {
      slider.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  // En móvil el usuario desliza: sincroniza los puntos con el scroll
  let raf;
  slider.addEventListener('scroll', () => {
    if (isDesktop()) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const left = slider.scrollLeft;
      let best = 0, dist = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft - slides[0].offsetLeft - left);
        if (d < dist) { dist = d; best = i; }
      });
      if (best !== index) { index = best; paint(); }
    });
  }, { passive: true });

  // En escritorio, clic en una tarjeta lateral la trae al frente
  slider.addEventListener('click', e => {
    const slide = e.target.closest('.slide');
    if (slide && isDesktop() && !slide.classList.contains('is-active')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      go(slides.indexOf(slide));
      restart();
    }
  }, true);

  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
  });

  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { if (!reduceMotion && !timer) timer = setInterval(() => go(index + 1), 4500); };
  const restart = () => { stop(); start(); };

  ['pointerenter', 'focusin', 'touchstart'].forEach(ev => slider.addEventListener(ev, stop, { passive: true }));
  ['pointerleave', 'focusout'].forEach(ev => slider.addEventListener(ev, start));

  // Solo rota mientras el hero está en pantalla
  new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop()).observe(slider);

  paint();
}

/* ---------- Guía rápida ---------- */
function initGuide() {
  const wrap = $('#spaceChips');
  const results = $('#guideResults');

  SPACES.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = s.label;
    b.setAttribute('aria-pressed', 'false');
    b.dataset.space = s.id;
    wrap.append(b);
  });

  const show = spaceId => {
    $$('.chip', wrap).forEach(c => c.setAttribute('aria-pressed', c.dataset.space === spaceId));
    const list = PRODUCTS.filter(p => p.spaces.includes(spaceId));
    results.innerHTML = list.map((p, i) => productHTML(p, { showLine: true, delay: i })).join('');
  };

  wrap.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) show(chip.dataset.space);
  });

  results.innerHTML = '<p class="guide-hint">Elige un espacio para ver la recomendación.</p>';
  bindProductEvents(results);
}

/* ---------- Plantilla de producto ---------- */
function productHTML(p, { showLine = false, delay = 0 } = {}) {
  const uid = `${p.id}-${Math.random().toString(36).slice(2, 7)}`;
  const radios = (name, opts) => opts.map((o, i) => `
    <label class="opt"><input type="radio" name="${name}-${uid}" value="${esc(o)}" ${i === 0 ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('');

  return `
  <article class="product" data-id="${p.id}" data-line="${p.line}" style="animation-delay:${delay * 50}ms">
    <div class="product-top">
      ${p.img
        ? `<img class="product-img" src="${esc(p.img)}" alt="" width="56" height="56" loading="lazy" decoding="async">`
        : `<span class="product-ico" aria-hidden="true"><svg class="ico"><use href="#i-${p.line}"/></svg></span>`}
      <div>
        ${showLine ? `<span class="line-tag">${esc(LINES[p.line].badge)}</span>` : ''}
        <h3>${esc(p.name)}</h3>
        <p class="use">${esc(p.use)}</p>
      </div>
    </div>
    <div>
      <p class="opt-label">Presentación</p>
      <div class="opts" role="radiogroup" aria-label="Presentación de ${esc(p.name)}">${radios('size', p.sizes)}</div>
    </div>
    ${p.scents?.length ? `
    <div>
      <p class="opt-label">Aroma</p>
      <div class="opts" role="radiogroup" aria-label="Aroma de ${esc(p.name)}">${radios('scent', p.scents)}</div>
    </div>` : ''}
    <div class="product-buy">
      <div class="stepper" aria-label="Cantidad">
        <button type="button" data-step="-1" aria-label="Menos" disabled><svg class="ico"><use href="#i-minus"/></svg></button>
        <output aria-live="polite">1</output>
        <button type="button" data-step="1" aria-label="Más"><svg class="ico"><use href="#i-plus"/></svg></button>
      </div>
      <button type="button" class="btn btn-primary btn-sm add-btn" data-add>
        <svg class="ico"><use href="#i-plus"/></svg> Agregar
      </button>
    </div>
  </article>`;
}

function bindProductEvents(container) {
  container.addEventListener('click', e => {
    const card = e.target.closest('.product');
    if (!card) return;

    const step = e.target.closest('[data-step]');
    if (step) {
      const out = $('output', card);
      const val = Math.min(99, Math.max(1, Number(out.value || out.textContent) + Number(step.dataset.step)));
      out.textContent = val;
      $('[data-step="-1"]', card).disabled = val <= 1;
      return;
    }

    const add = e.target.closest('[data-add]');
    if (add) {
      const p = byId(card.dataset.id);
      const size = $('input[name^="size-"]:checked', card)?.value;
      const scent = $('input[name^="scent-"]:checked', card)?.value || '';
      const qty = Number($('output', card).textContent);
      Cart.add(p.id, size, scent, qty);

      add.classList.add('added');
      add.innerHTML = '<svg class="ico"><use href="#i-check"/></svg> Agregado';
      setTimeout(() => {
        add.classList.remove('added');
        add.innerHTML = '<svg class="ico"><use href="#i-plus"/></svg> Agregar';
      }, 1400);
      toast(`${qty} × ${p.name} agregado`);
      bubbleBurst(add);
    }
  });
}

/* ---------- Hojas (dialog) ---------- */
function initSheets() {
  const lineSheet = $('#lineSheet');
  const cartSheet = $('#cartSheet');
  bindProductEvents($('#lineProducts'));

  document.addEventListener('click', e => {
    const lineBtn = e.target.closest('[data-open-line]');
    if (lineBtn) { openLine(lineBtn.dataset.openLine); return; }

    if (e.target.closest('[data-open-cart]')) {
      if (lineSheet.open) lineSheet.close();
      hideToast();
      openDialog(cartSheet);
      return;
    }

    const closer = e.target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
  });

  // Cerrar tocando el fondo oscuro
  [lineSheet, cartSheet].forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  });

  // Gesto: deslizar hacia abajo para cerrar (móvil)
  [lineSheet, cartSheet].forEach(d => {
    const grip = $('.sheet-head', d);
    let startY = null;
    grip.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    grip.addEventListener('touchmove', e => {
      if (startY === null) return;
      const dy = Math.max(0, e.touches[0].clientY - startY);
      $('.sheet-inner', d).style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    grip.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - startY;
      $('.sheet-inner', d).style.transform = '';
      startY = null;
      if (dy > 90) d.close();
    });
  });

  $('#cartSend').addEventListener('click', () => Cart.send());
  $('#cartNew').addEventListener('click', () => { Cart.justSent = false; Cart.render(); });
  $('#copyFolio').addEventListener('click', async e => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(Cart.lastOrder.folio);
      btn.textContent = 'Copiado';
    } catch {
      btn.textContent = 'No se pudo copiar';
    }
    setTimeout(() => { btn.textContent = 'Copiar folio'; }, 1500);
  });
  // Al cerrar la hoja, la confirmación se cambia por el aviso de "último folio"
  cartSheet.addEventListener('close', () => {
    if (Cart.justSent) { Cart.justSent = false; Cart.render(); }
  });
  $('#cartClear').addEventListener('click', () => {
    if (!Cart.items.length) return;
    if (confirm('¿Vaciar tu cotización?')) Cart.clear();
  });
  $('#cartList').addEventListener('click', e => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const key = item.dataset.key;
    const step = e.target.closest('[data-step]');
    if (step) Cart.change(key, Number(step.dataset.step));
    if (e.target.closest('[data-remove]')) Cart.remove(key);
  });

  // Guarda nombre/tipo/notas para que no se pierdan
  const form = $('#cartForm');
  form.addEventListener('input', () => Cart.saveForm(form));
  form.addEventListener('submit', e => e.preventDefault());
  Cart.restoreForm(form);
}

function openDialog(d) {
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
}

function openLine(lineId) {
  const line = LINES[lineId];
  if (!line) return;
  const sheet = $('#lineSheet');
  $('#lineThumb').src = line.img;
  $('#lineBadge').textContent = line.badge;
  $('#lineTitle').textContent = line.name;
  $('#lineProducts').innerHTML = PRODUCTS
    .filter(p => p.line === lineId)
    .map((p, i) => productHTML(p, { delay: i }))
    .join('');
  if (!sheet.open) openDialog(sheet);
  $('#lineProducts').scrollTop = 0;
}

/* ---------- Mi cotización ---------- */
const Cart = {
  items: [],
  form: { nombre: '', tipo: 'Hogar', notas: '', promos: false },
  lastOrder: null,   // { folio, url, fecha } del último pedido enviado
  justSent: false,   // muestra la confirmación mientras la hoja sigue abierta

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.items = (data.items || []).filter(i => byId(i.id));
      this.form = { ...this.form, ...(data.form || {}) };
      this.lastOrder = data.lastOrder || null;
    } catch { /* sin almacenamiento: funciona en memoria */ }
  },
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: this.items, form: this.form, lastOrder: this.lastOrder }));
    } catch {}
  },
  key: (id, size, scent) => [id, size, scent].join('|'),

  add(id, size, scent, qty) {
    const key = this.key(id, size, scent);
    const found = this.items.find(i => i.key === key);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else this.items.push({ key, id, size, scent, qty });
    this.justSent = false;
    this.commit(true);
  },
  change(key, delta) {
    const it = this.items.find(i => i.key === key);
    if (!it) return;
    it.qty = Math.min(99, it.qty + delta);
    if (it.qty < 1) return this.remove(key);
    this.commit();
  },
  remove(key) { this.items = this.items.filter(i => i.key !== key); this.commit(); },
  clear() { this.items = []; this.commit(); },
  count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  commit(bump = false) { this.save(); this.render(bump); },

  saveForm(form) {
    const fd = new FormData(form);
    this.form = {
      nombre: fd.get('nombre') || '',
      tipo: fd.get('tipo') || 'Hogar',
      notas: fd.get('notas') || '',
      promos: fd.get('promos') === 'si'   // consentimiento para finalidades secundarias (opcional)
    };
    this.save();
  },
  restoreForm(form) {
    form.nombre.value = this.form.nombre;
    form.notas.value = this.form.notas;
    form.promos.checked = !!this.form.promos;
    const radio = form.querySelector(`input[name="tipo"][value="${this.form.tipo}"]`);
    if (radio) radio.checked = true;
  },

  // Abre WhatsApp con el pedido, lo registra en Google Sheets y vacía la lista
  send() {
    if (!this.items.length) return;
    const folio = newFolio();
    const url = waLink(this.message(folio));
    // window.open va primero y dentro del clic para que el navegador no lo bloquee
    window.open(url, '_blank', 'noopener');

    logOrder({
      folio,
      nombre: this.form.nombre,
      tipo: this.form.tipo,
      notas: this.form.notas,
      promos: !!this.form.promos,
      items: this.items.map(i => {
        const p = byId(i.id);
        return { linea: LINES[p.line].name, producto: p.name, presentacion: i.size, aroma: i.scent, cantidad: i.qty };
      })
    });

    this.lastOrder = { folio, url, fecha: new Date().toISOString() };
    this.justSent = true;
    this.items = [];
    this.commit();
  },

  message(folio) {
    const lines = this.items.map(i => {
      const p = byId(i.id);
      const detail = [i.size, i.scent].filter(Boolean).join(', ');
      return `• ${i.qty} × ${p.name} (${detail})`;
    });
    const f = this.form;
    return [
      'Hola Espumar, me gustaría cotizar este pedido:',
      `Folio: ${folio}`,
      '',
      ...lines,
      '',
      f.nombre ? `Nombre: ${f.nombre}` : null,
      `Compro para: ${f.tipo}`,
      f.notas ? `Notas: ${f.notas}` : null,
      f.promos ? 'Acepto recibir promociones por WhatsApp.' : null
    ].filter(l => l !== null).join('\n');
  },

  render(bump = false) {
    const n = this.count();
    $$('[data-cart-count]').forEach(el => {
      el.textContent = n > 99 ? '99+' : n;
      el.hidden = n === 0;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    $$('[data-cart-count-plain]').forEach(el => { el.textContent = n; });
    $('.fab-cart').hidden = n === 0;

    const list = $('#cartList');
    list.innerHTML = this.items.map(i => {
      const p = byId(i.id);
      const detail = [i.size, i.scent].filter(Boolean).join(' · ');
      return `
      <li class="cart-item" data-key="${esc(i.key)}">
        <div>
          <h3>${esc(p.name)}</h3>
          <small>${esc(LINES[p.line].badge)} · ${esc(detail)}</small>
        </div>
        <div class="cart-item-ctrl">
          <div class="stepper" aria-label="Cantidad de ${esc(p.name)}">
            <button type="button" data-step="-1" aria-label="Menos"><svg class="ico"><use href="#i-minus"/></svg></button>
            <output>${i.qty}</output>
            <button type="button" data-step="1" aria-label="Más"><svg class="ico"><use href="#i-plus"/></svg></button>
          </div>
          <button type="button" class="remove-btn" data-remove><svg class="ico"><use href="#i-trash"/></svg> Quitar</button>
        </div>
      </li>`;
    }).join('');

    const empty = this.items.length === 0;
    const done = this.justSent && !!this.lastOrder;
    $('#cartDone').hidden = !done;
    $('#cartEmpty').hidden = !empty || done;
    $('#cartForm').hidden = empty;
    $('#cartFoot').hidden = done;
    $('#cartSend').disabled = empty;
    $('#cartClear').hidden = empty;

    const last = this.lastOrder;
    if (last) {
      $('#doneFolio').textContent = last.folio;
      $('#doneWa').href = last.url;
      $('#lastFolio').textContent = last.folio;
      $('#lastWa').href = last.url;
    }
    $('#lastOrder').hidden = !last || done;
  }
};

/* ---------- Folio y registro del pedido ---------- */
// Formato ESP-AAMMDD-XXXX (sin 0/O/1/I para que no se confundan al dictarlo)
function newFolio() {
  const d = new Date();
  const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()]
    .map(n => String(n).padStart(2, '0')).join('');
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return `ESP-${ymd}-${[...rnd].map(b => abc[b % abc.length]).join('')}`;
}

// Registra el pedido en el panel de administración (/api/orders) y, si está
// configurado, también en Google Sheets.
function logOrder(order) {
  if (location.protocol.startsWith('http')) {
    fetch('/api/orders', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    }).catch(() => {});
  }
  if (!SHEETS_URL) return;
  // Apps Script no responde con CORS: se manda como text/plain en modo no-cors
  const body = JSON.stringify(order);
  try {
    fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    }).catch(() => {});
  } catch {
    navigator.sendBeacon?.(SHEETS_URL, new Blob([body], { type: 'text/plain' }));
  }
}

/* ---------- Detalles visuales ---------- */
// Las imágenes aparecen con un fundido cuando terminan de cargar (el CSS muestra un brillo mientras tanto)
function initImages() {
  $$('.card-media img, .slide img').forEach(img => {
    const done = () => img.classList.add('loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
}

// Cifras del hero: se calculan desde el catálogo y cuentan hacia arriba al verse
function initStats() {
  const values = {
    lines: Object.keys(LINES).length,
    products: PRODUCTS.length,
    scents: new Set(PRODUCTS.flatMap(p => p.scents || [])).size
  };
  const els = $$('[data-stat]');
  els.forEach(el => { el.textContent = values[el.dataset.stat]; });
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const el = entry.target;
      const end = values[el.dataset.stat];
      const t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / 900);
        el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  els.forEach(el => io.observe(el));
}

// Pequeña explosión de burbujas al agregar un producto (guiño a la "espuma")
function bubbleBurst(origin) {
  if (reduceMotion) return;
  const r = origin.getBoundingClientRect();
  const host = origin.closest('dialog') || document.body;
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('span');
    const size = 6 + Math.random() * 10;
    const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
    const dist = 30 + Math.random() * 30;
    b.className = 'pop-bubble';
    b.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${size}px;height:${size}px;` +
      `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 20}px`;
    host.append(b);
    b.addEventListener('animationend', () => b.remove(), { once: true });
  }
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  // Si hay una hoja abierta, el aviso va dentro de ella (si no, quedaría detrás del modal)
  const host = $('dialog[open] .sheet-inner') || document.body;
  if (t.parentElement !== host) host.append(t);
  $('#toastMsg').textContent = msg;
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 2600);
}
function hideToast() { $('#toast').hidden = true; }

/* ---------- Tabs (Hogar / Negocio) ---------- */
function initTabs() {
  const tabs = $$('[role="tab"]');
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      select(next); next.focus();
    });
  });
}

/* ---------- Aparición al hacer scroll ---------- */
function initReveal() {
  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ---------- Resaltar sección activa en el menú ---------- */
function initScrollSpy() {
  const links = $$('.nav a[href^="#"]');
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.remove('active'));
      map.get(entry.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}
