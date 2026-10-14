// Almacenamiento en Vercel Blob (privado). Cada entorno usa su propio prefijo
// para que las pruebas locales nunca toquen los datos de producción.
import { put, get, list, del } from '@vercel/blob';
import { HttpError } from './http.js';

const NS = process.env.VERCEL_ENV === 'production' ? 'prod/' : 'dev/';
const full = p => NS + p;

function isConflict(err) {
  const s = `${err?.name} ${err?.message}`;
  return /precondition|already exists|exists|412|409|etag/i.test(s);
}

export async function readJSON(p) {
  let r;
  try {
    r = await get(full(p), { access: 'private', useCache: false });
  } catch (err) {
    if (/not ?found|404/i.test(`${err?.name} ${err?.message}`)) return null;
    throw err;
  }
  if (!r || r.statusCode !== 200) return null;
  const text = await new Response(r.stream).text();
  return { data: JSON.parse(text), etag: r.blob.etag };
}

// etag → solo escribe si nadie cambió el archivo (control de concurrencia)
// create → falla si el archivo ya existe
export async function writeJSON(p, data, { etag, create } = {}) {
  const opts = {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 60
  };
  if (etag) opts.ifMatch = etag;
  else if (!create) opts.allowOverwrite = true;
  try {
    const res = await put(full(p), JSON.stringify(data), opts);
    return res.etag;
  } catch (err) {
    if ((etag || create) && isConflict(err)) {
      throw new HttpError(409, 'Otra persona modificó estos datos. Recarga e intenta de nuevo.');
    }
    throw err;
  }
}

export async function listPaths(prefix, limit = 1000) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix: full(prefix), cursor, limit: Math.min(1000, limit - out.length) });
    for (const b of page.blobs) out.push({ path: b.pathname.slice(NS.length), uploadedAt: b.uploadedAt });
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < limit);
  return out;
}

export async function remove(p) {
  await del(full(p));
}

export async function putImage(name, bytes, contentType) {
  await put(full(`img/${name}`), bytes, {
    access: 'private',
    contentType,
    addRandomSuffix: false,
    cacheControlMaxAge: 31536000
  });
}

export async function readImage(name) {
  try {
    const r = await get(full(`img/${name}`), { access: 'private' });
    return r && r.statusCode === 200 ? r : null;
  } catch {
    return null;
  }
}
