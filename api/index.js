// API de Espumar: una sola función con todas las rutas (el plan Hobby de Vercel
// limita el número de funciones). vercel.json reescribe /api/<ruta> → /api/index?__path=<ruta>.
import { randomBytes } from 'node:crypto';
import { json, readBody, HttpError, sessionCookie, assertSameOrigin } from './_lib/http.js';
import { readJSON, writeJSON, listPaths, remove, putImage, readImage } from './_lib/store.js';
import {
  ROLES, SESSION_HOURS, hashPassword, verifyPassword, fakeVerify, safeEqual,
  signSession, requireUser, publicUser
} from './_lib/auth.js';
import { DEFAULT_CATALOG, DEFAULT_CONFIG, ESTADOS } from './_lib/defaults.js';
import {
  cleanCatalog, cleanConfig, cleanOrder, cleanEstado, cleanUsername, cleanPassword,
  cleanRole, cleanText, str, IMG_NAME, FOLIO
} from './_lib/validate.js';

const STAFF = ['admin', 'editor', 'ventas'];
const EDITORS = ['admin', 'editor'];
const ADMINS = ['admin'];

const getCatalog = async () => (await readJSON('data/catalog.json')) || { data: DEFAULT_CATALOG, etag: null };
const getConfig = async () => (await readJSON('data/config.json')) || { data: DEFAULT_CONFIG, etag: null };

async function allUsers() {
  const paths = await listPaths('users/');
  const recs = await Promise.all(paths.map(p => readJSON(p.path)));
  return recs.filter(Boolean).map(r => r.data);
}

async function loadOrders(limit = 300) {
  const paths = (await listPaths('orders/', 5000)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const out = [];
  for (let i = 0; i < Math.min(limit, paths.length); i += 25) {
    const chunk = await Promise.all(paths.slice(i, i + 25).map(p => readJSON(p.path)));
    out.push(...chunk.filter(Boolean).map(r => r.data));
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

const ROUTES = {
  /* ---------- Público ---------- */

  // Catálogo e información para la web (en caché del CDN unos segundos)
  'GET catalog': async () => {
    const [cat, cfg] = await Promise.all([getCatalog(), getConfig()]);
    const catalog = { lines: cat.data.lines, products: cat.data.products.filter(p => p.active) };
    return json({ catalog, config: cfg.data }, 200, {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'public, s-maxage=20, stale-while-revalidate=300'
    });
  },

  // Pedido enviado desde la web
  'POST orders': async req => {
    const o = cleanOrder(await readBody(req, 20_000));
    const now = new Date().toISOString();
    const order = { ...o, fecha: now, estado: 'Nuevo', seguimiento: '', historial: [{ fecha: now, estado: 'Nuevo', por: 'web' }] };
    try {
      await writeJSON(`orders/${o.folio}.json`, order, { create: true });
    } catch (err) {
      if (err.status === 409) return json({ ok: true, duplicado: true });
      throw err;
    }
    return json({ ok: true }, 201);
  },

  // Imágenes subidas desde el panel
  'GET img': async (req, url) => {
    const name = url.searchParams.get('p') || '';
    if (!IMG_NAME.test(name)) throw new HttpError(404, 'Imagen no encontrada.');
    const r = await readImage(name);
    if (!r) throw new HttpError(404, 'Imagen no encontrada.');
    return new Response(r.stream, {
      headers: { 'Content-Type': r.blob.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
  },

  /* ---------- Sesión ---------- */

  'GET auth/status': async () => {
    const users = await listPaths('users/', 1);
    return json({ hasUsers: users.length > 0, setupEnabled: Boolean(process.env.SETUP_CODE) });
  },

  // Crea el primer administrador. Solo funciona mientras no exista ningún usuario
  // y con el código de configuración guardado en las variables de Vercel.
  'POST auth/setup': async req => {
    const b = await readBody(req);
    const code = process.env.SETUP_CODE;
    if (!code) throw new HttpError(403, 'La configuración inicial está desactivada.');
    if ((await listPaths('users/', 1)).length) throw new HttpError(409, 'Ya existe un administrador. Inicia sesión.');
    if (!safeEqual(str(b.codigo, 100), code)) throw new HttpError(403, 'Código de configuración incorrecto.');
    const user = {
      usuario: cleanUsername(b.usuario), nombre: str(b.nombre, 60) || 'Administrador', rol: 'admin',
      activo: true, hash: await hashPassword(cleanPassword(b.contrasena)), sv: 0,
      creado: new Date().toISOString(), ultimoAcceso: new Date().toISOString(), fallos: 0
    };
    await writeJSON(`users/${user.usuario}.json`, user, { create: true });
    return json({ user: publicUser(user) }, 201, { 'Set-Cookie': sessionCookie(req, signSession(user), SESSION_HOURS * 3600) });
  },

  'POST auth/login': async req => {
    const b = await readBody(req);
    const usuario = str(b.usuario, 30).toLowerCase();
    const pass = String(b.contrasena ?? '');
    const rec = /^[a-z0-9._-]{3,30}$/.test(usuario) ? await readJSON(`users/${usuario}.json`) : null;
    if (!rec) { await fakeVerify(pass); throw new HttpError(401, 'Usuario o contraseña incorrectos.'); }
    const user = rec.data;
    if (user.bloqueoHasta && new Date(user.bloqueoHasta) > new Date()) {
      const min = Math.ceil((new Date(user.bloqueoHasta) - Date.now()) / 60000);
      throw new HttpError(429, `Demasiados intentos. Intenta de nuevo en ${min} min.`);
    }
    const ok = await verifyPassword(pass, user.hash);
    if (!ok || !user.activo) {
      if (!ok) {
        user.fallos = (user.fallos || 0) + 1;
        if (user.fallos >= 5) { user.bloqueoHasta = new Date(Date.now() + 15 * 60000).toISOString(); user.fallos = 0; }
        await writeJSON(`users/${usuario}.json`, user);
      }
      throw new HttpError(401, ok ? 'Tu usuario está desactivado. Habla con un administrador.' : 'Usuario o contraseña incorrectos.');
    }
    user.fallos = 0;
    delete user.bloqueoHasta;
    user.ultimoAcceso = new Date().toISOString();
    await writeJSON(`users/${usuario}.json`, user);
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(req, signSession(user), SESSION_HOURS * 3600) });
  },

  'POST auth/logout': async req => json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(req, '', 0) }),

  // Sin sesión responde 200 con user: null (así el panel no registra un error en consola)
  'GET auth/me': async req => {
    try {
      const user = await requireUser(req, STAFF);
      return json({ user: publicUser(user), roles: ROLES });
    } catch (err) {
      if (err.status === 401) return json({ user: null, roles: ROLES });
      throw err;
    }
  },

  'POST auth/password': async req => {
    const user = await requireUser(req, STAFF);
    const b = await readBody(req);
    if (!(await verifyPassword(String(b.actual ?? ''), user.hash))) throw new HttpError(400, 'La contraseña actual no es correcta.');
    user.hash = await hashPassword(cleanPassword(b.nueva));
    user.sv = (user.sv || 0) + 1; // cierra las demás sesiones
    await writeJSON(`users/${user.usuario}.json`, user);
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(req, signSession(user), SESSION_HOURS * 3600) });
  },

  /* ---------- Pedidos ---------- */

  'GET admin/orders': async req => {
    await requireUser(req, STAFF);
    return json({ orders: await loadOrders(), estados: ESTADOS });
  },

  'PATCH admin/orders': async req => {
    const user = await requireUser(req, STAFF);
    const b = await readBody(req);
    const folio = str(b.folio, 20);
    if (!FOLIO.test(folio)) throw new HttpError(400, 'Folio inválido.');
    const rec = await readJSON(`orders/${folio}.json`);
    if (!rec) throw new HttpError(404, 'El pedido no existe.');
    const o = rec.data;
    if (b.estado !== undefined && b.estado !== o.estado) {
      o.estado = cleanEstado(b.estado);
      o.historial = [...(o.historial || []), { fecha: new Date().toISOString(), estado: o.estado, por: user.nombre || user.usuario }].slice(-50);
    }
    if (b.seguimiento !== undefined) o.seguimiento = cleanText(b.seguimiento, 1000);
    await writeJSON(`orders/${folio}.json`, o, { etag: rec.etag });
    return json({ order: o });
  },

  'DELETE admin/orders': async (req, url) => {
    await requireUser(req, ADMINS);
    const folio = url.searchParams.get('folio') || '';
    if (!FOLIO.test(folio)) throw new HttpError(400, 'Folio inválido.');
    await remove(`orders/${folio}.json`);
    return json({ ok: true });
  },

  /* ---------- Catálogo e información ---------- */

  'GET admin/catalog': async req => {
    await requireUser(req, STAFF);
    const c = await getCatalog();
    return json({ catalog: c.data, etag: c.etag });
  },

  'PUT admin/catalog': async req => {
    await requireUser(req, EDITORS);
    const b = await readBody(req, 300_000);
    const catalog = cleanCatalog(b.catalog);
    const etag = await writeJSON('data/catalog.json', catalog, b.etag ? { etag: b.etag } : { create: true });
    return json({ catalog, etag });
  },

  'GET admin/config': async req => {
    await requireUser(req, STAFF);
    const c = await getConfig();
    return json({ config: c.data, etag: c.etag });
  },

  'PUT admin/config': async req => {
    await requireUser(req, EDITORS);
    const b = await readBody(req);
    const config = cleanConfig(b.config);
    const etag = await writeJSON('data/config.json', config, b.etag ? { etag: b.etag } : { create: true });
    return json({ config, etag });
  },

  // Sube una imagen (ya comprimida en el navegador) y devuelve su URL
  'POST admin/upload': async req => {
    await requireUser(req, EDITORS);
    const type = (req.headers.get('content-type') || '').split(';')[0];
    const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[type];
    if (!ext) throw new HttpError(415, 'Formato no permitido. Usa JPG, PNG o WebP.');
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length > 2_000_000) throw new HttpError(413, 'La imagen pesa más de 2 MB.');
    const sig = bytes.subarray(0, 12);
    const okSig = ext === 'png' ? sig[0] === 0x89 && sig[1] === 0x50
      : ext === 'jpg' ? sig[0] === 0xff && sig[1] === 0xd8
      : sig.toString('latin1', 0, 4) === 'RIFF' && sig.toString('latin1', 8, 12) === 'WEBP';
    if (!okSig) throw new HttpError(415, 'El archivo no es una imagen válida.');
    const name = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${ext}`;
    await putImage(name, bytes, type);
    return json({ url: `/api/img?p=${name}` }, 201);
  },

  /* ---------- Usuarios (solo administradores) ---------- */

  'GET admin/users': async req => {
    await requireUser(req, ADMINS);
    const users = (await allUsers()).map(publicUser).sort((a, b) => a.usuario.localeCompare(b.usuario));
    return json({ users, roles: ROLES });
  },

  'POST admin/users': async req => {
    await requireUser(req, ADMINS);
    const b = await readBody(req);
    const user = {
      usuario: cleanUsername(b.usuario), nombre: str(b.nombre, 60), rol: cleanRole(b.rol),
      activo: true, hash: await hashPassword(cleanPassword(b.contrasena)), sv: 0,
      creado: new Date().toISOString(), ultimoAcceso: null, fallos: 0
    };
    try {
      await writeJSON(`users/${user.usuario}.json`, user, { create: true });
    } catch (err) {
      if (err.status === 409) throw new HttpError(409, 'Ese nombre de usuario ya existe.');
      throw err;
    }
    return json({ user: publicUser(user) }, 201);
  },

  'PATCH admin/users': async req => {
    const me = await requireUser(req, ADMINS);
    const b = await readBody(req);
    const usuario = cleanUsername(b.usuario);
    const rec = await readJSON(`users/${usuario}.json`);
    if (!rec) throw new HttpError(404, 'El usuario no existe.');
    const u = rec.data;
    const isSelf = usuario === me.usuario;
    if (b.nombre !== undefined) u.nombre = str(b.nombre, 60);
    const losesAdmin = (b.rol !== undefined && b.rol !== 'admin') || b.activo === false;
    if (u.rol === 'admin' && losesAdmin) {
      if (isSelf) throw new HttpError(400, 'No puedes quitarte a ti mismo el rol de administrador ni desactivarte.');
      const admins = (await allUsers()).filter(x => x.rol === 'admin' && x.activo);
      if (admins.length <= 1) throw new HttpError(400, 'Debe quedar al menos un administrador activo.');
    }
    if (b.rol !== undefined) u.rol = cleanRole(b.rol);
    if (b.activo !== undefined) {
      u.activo = b.activo === true;
      u.sv = (u.sv || 0) + 1; // cierra sus sesiones
    }
    if (b.contrasena) {
      u.hash = await hashPassword(cleanPassword(b.contrasena));
      u.sv = (u.sv || 0) + 1;
      u.fallos = 0;
      delete u.bloqueoHasta;
    }
    await writeJSON(`users/${usuario}.json`, u, { etag: rec.etag });
    return json({ user: publicUser(u) });
  },

  'DELETE admin/users': async (req, url) => {
    const me = await requireUser(req, ADMINS);
    const usuario = cleanUsername(url.searchParams.get('usuario'));
    if (usuario === me.usuario) throw new HttpError(400, 'No puedes eliminar tu propio usuario.');
    const rec = await readJSON(`users/${usuario}.json`);
    if (!rec) throw new HttpError(404, 'El usuario no existe.');
    if (rec.data.rol === 'admin') {
      const admins = (await allUsers()).filter(x => x.rol === 'admin' && x.activo);
      if (admins.length <= 1) throw new HttpError(400, 'Debe quedar al menos un administrador activo.');
    }
    await remove(`users/${usuario}.json`);
    return json({ ok: true });
  }
};

// Rutas públicas que modifican datos (sin sesión): no exigen la cabecera del panel
const PUBLIC_WRITES = new Set(['POST orders', 'POST auth/login', 'POST auth/setup']);

async function handle(request) {
  const url = new URL(request.url);
  const route = (url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\/?/, ''))
    .replace(/^\/+|\/+$/g, '');
  const key = `${request.method} ${route}`;
  try {
    const fn = ROUTES[key];
    if (!fn) return json({ error: 'Ruta no encontrada.' }, 404);
    if (request.method !== 'GET') {
      if (PUBLIC_WRITES.has(key)) {
        const origin = request.headers.get('origin');
        if (origin && origin !== url.origin) throw new HttpError(403, 'Origen no permitido.');
      } else {
        assertSameOrigin(request);
      }
    }
    return await fn(request, url);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(key, err);
    return json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
