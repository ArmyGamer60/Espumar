// Utilidades HTTP para la API (respuestas JSON, errores, lectura del cuerpo, cookies)

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export async function readBody(request, maxBytes = 50_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'La solicitud es demasiado grande.');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Formato de datos inválido.');
  }
}

export function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function sessionCookie(request, token, maxAgeSeconds) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `esp_session=${token ?? ''}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

// Protección CSRF para operaciones del panel: exige una cabecera propia
// (un sitio ajeno no puede enviarla sin permiso CORS) y que el origen coincida.
export function assertSameOrigin(request) {
  if (request.headers.get('x-espumar') !== '1') throw new HttpError(403, 'Solicitud no permitida.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Origen no permitido.');
}
