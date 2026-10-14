// Validación y limpieza de todo lo que entra a la API
import { HttpError } from './http.js';
import { LINE_KEYS, SPACES, ESTADOS } from './defaults.js';
import { ROLES } from './auth.js';

const bad = msg => { throw new HttpError(400, msg); };
export const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
const strList = (arr, maxItems, maxLen) => (Array.isArray(arr) ? arr : []).map(x => str(x, maxLen)).filter(Boolean).slice(0, maxItems);

// Imágenes permitidas: las del sitio (img/...) o las subidas desde el panel
export const IMG_NAME = /^[a-z0-9]+-[a-f0-9]{8}\.(webp|jpg|png)$/;
const validImg = v => v === '' || /^img\/[a-z0-9-]+\.(webp|png|jpg)$/.test(v) || (v.startsWith('/api/img?p=') && IMG_NAME.test(v.slice(11)));

export function cleanCatalog(input) {
  const lines = {};
  for (const key of LINE_KEYS) {
    const l = input?.lines?.[key] || {};
    const img = str(l.img, 120);
    if (!validImg(img)) bad(`Imagen inválida en la línea ${key}.`);
    lines[key] = { name: str(l.name, 40) || bad(`La línea ${key} necesita nombre.`), badge: str(l.badge, 20), desc: str(l.desc, 200), img };
  }
  const raw = Array.isArray(input?.products) ? input.products : bad('Falta la lista de productos.');
  if (raw.length > 200) bad('Máximo 200 productos.');
  const seen = new Set();
  const products = raw.map(p => {
    const id = str(p.id, 60);
    if (!/^[a-z0-9-]{2,60}$/.test(id) || seen.has(id)) bad(`Identificador de producto inválido o repetido: ${id}`);
    seen.add(id);
    if (!LINE_KEYS.includes(p.line)) bad(`Línea inválida en ${id}.`);
    const name = str(p.name, 80) || bad('Todos los productos necesitan nombre.');
    const sizes = strList(p.sizes, 6, 30);
    if (!sizes.length) bad(`“${name}” necesita al menos una presentación.`);
    const img = str(p.img, 120);
    if (!validImg(img)) bad(`Imagen inválida en “${name}”.`);
    return {
      id, line: p.line, name,
      use: str(p.use, 200),
      sizes,
      scents: strList(p.scents, 8, 30),
      spaces: strList(p.spaces, 9, 20).filter(s => SPACES.includes(s)),
      img,
      active: p.active !== false
    };
  });
  return { lines, products };
}

export function cleanConfig(c) {
  const whatsapp = str(c?.whatsapp, 15).replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(whatsapp)) bad('El WhatsApp debe tener de 10 a 15 dígitos, con lada de país (ej. 52...).');
  const instagram = str(c?.instagram, 30).replace(/^@/, '');
  if (instagram && !/^[\w.]+$/.test(instagram)) bad('Usuario de Instagram inválido.');
  const email = str(c?.email, 80);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Correo inválido.');
  return {
    whatsapp,
    telefono: str(c?.telefono, 25),
    instagram,
    email,
    heroPill: str(c?.heroPill, 40),
    heroSubtitle: str(c?.heroSubtitle, 200),
    anuncio: { activo: c?.anuncio?.activo === true, texto: str(c?.anuncio?.texto, 140) }
  };
}

export const FOLIO = /^ESP-\d{6}-[A-Z0-9]{4}$/;

export function cleanOrder(o) {
  const folio = str(o?.folio, 20);
  if (!FOLIO.test(folio)) bad('Folio inválido.');
  const items = (Array.isArray(o?.items) ? o.items : []).slice(0, 50).map(i => ({
    linea: str(i.linea, 40),
    producto: str(i.producto, 80),
    presentacion: str(i.presentacion, 30),
    aroma: str(i.aroma, 30),
    cantidad: Math.min(99, Math.max(1, parseInt(i.cantidad, 10) || 1))
  })).filter(i => i.producto);
  if (!items.length) bad('El pedido no tiene productos.');
  return {
    folio,
    nombre: str(o.nombre, 60),
    tipo: ['Hogar', 'Negocio'].includes(o.tipo) ? o.tipo : '',
    notas: text(o.notas, 300),
    promos: o.promos === true,
    items
  };
}

export function cleanEstado(e) {
  if (!ESTADOS.includes(e)) bad('Estado inválido.');
  return e;
}

export function cleanUsername(u) {
  const usuario = str(u, 30).toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) bad('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.');
  return usuario;
}

export function cleanPassword(p) {
  const s = String(p ?? '');
  if (s.length < 8 || s.length > 128) bad('La contraseña debe tener al menos 8 caracteres.');
  return s;
}

export function cleanRole(r) {
  if (!Object.hasOwn(ROLES, r)) bad('Rol inválido.');
  return r;
}

export { text as cleanText };
