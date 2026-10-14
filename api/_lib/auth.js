// Contraseñas (scrypt) y sesiones firmadas (HMAC) para el panel
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError, getCookie } from './http.js';
import { readJSON } from './store.js';

const scrypt = promisify(scryptCb);
export const SESSION_HOURS = 12;

export const ROLES = {
  admin: 'Administrador',   // todo, incluidos usuarios
  editor: 'Editor',         // pedidos, catálogo e información
  ventas: 'Ventas'          // solo pedidos
};

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Hash de relleno: si el usuario no existe se compara igual, para no revelar
// por el tiempo de respuesta qué usuarios existen.
let dummyHash;
export async function fakeVerify(password) {
  dummyHash ??= await hashPassword('espumar-relleno');
  await verifyPassword(password, dummyHash);
  return false;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new HttpError(500, 'Falta configurar SESSION_SECRET en Vercel.');
  return s;
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signSession(user) {
  const payload = { u: user.usuario, v: user.sv || 0, exp: Date.now() + SESSION_HOURS * 3600_000 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readToken(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export function publicUser(u) {
  const { hash, fallos, bloqueoHasta, sv, ...rest } = u;
  return rest;
}

// Devuelve el usuario de la sesión (o lanza 401/403). Revisa en cada solicitud
// que siga activo y que no haya cambiado su contraseña desde que inició sesión.
export async function requireUser(request, roles) {
  const p = readToken(getCookie(request, 'esp_session'));
  if (!p) throw new HttpError(401, 'Inicia sesión para continuar.');
  const rec = await readJSON(`users/${p.u}.json`);
  const user = rec?.data;
  if (!user || !user.activo || (user.sv || 0) !== p.v) throw new HttpError(401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
  if (roles && !roles.includes(user.rol)) throw new HttpError(403, 'Tu rol no tiene permiso para esta sección.');
  return user;
}
