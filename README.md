# Espumar · Sitio web interactivo

Sitio de una sola página para **Espumar**, marca de productos de limpieza con cuatro líneas: Automotriz, Hogar, Ropa y Personal. El cliente arma su cotización desde el celular y la envía por WhatsApp con un folio de seguimiento, sin registrarse.

Proyecto final de **Diseño Web Interactivo · UTEL**.

**Sitio en línea:** https://espumar.vercel.app (cada `git push` a `main` vuelve a desplegarlo en Vercel).

## Funciones
- Diseño **mobile-first** (celular → tablet → escritorio), sin frameworks ni librerías.
- Catálogo de 16 productos con filtros, carrusel y hojas de producto: presentación, aroma y cantidad.
- **Guía rápida** "¿Qué quieres limpiar hoy?".
- **Mi cotización**: lista sin registro y envío por WhatsApp con folio `ESP-AAMMDD-XXXX`.
- Registro opcional de pedidos en **Google Sheets** (ver `google-apps-script/`).
- **Aviso de privacidad** conforme a la LFPDPPP 2025.

## Panel de administración (`/admin`)
https://espumar.vercel.app/admin, diseñado primero para celular.

| Sección | Qué permite | Roles |
|---|---|---|
| Resumen | Pedidos nuevos, en proceso y entregados; productos más pedidos | Todos |
| Pedidos | Buscar y filtrar, cambiar estado (Nuevo → Entregado), notas internas e historial | Todos (eliminar: solo Administrador) |
| Catálogo | Agregar, editar y eliminar productos; mostrar u ocultar en la web; cambiar orden; subir imágenes de productos y de líneas | Administrador, Editor |
| Información | WhatsApp, teléfono, Instagram, textos de portada y barra de anuncio | Administrador, Editor |
| Usuarios | Crear usuarios, asignar rol, desactivar, restablecer contraseñas | Administrador |
| Mi cuenta | Cambiar la propia contraseña, cerrar sesión | Todos |

**Primer acceso:** entra a `/admin` y crea el primer administrador con el código de configuración guardado en `.env.setup`. Ese archivo es local y no se sube a GitHub; también puede consultarse en Vercel → Settings → Environment Variables → `SETUP_CODE`. Después del primer administrador, el código ya no sirve.

**Cómo funciona:** los datos (catálogo, información, pedidos y usuarios) y las imágenes viven en un almacenamiento privado de **Vercel Blob**. La API es una sola función en `api/index.js`. Las contraseñas se guardan cifradas con scrypt y las sesiones duran 12 h. Tras 5 intentos fallidos, la cuenta se bloquea 15 min.

**Variables de entorno en Vercel:** `BLOB_READ_WRITE_TOKEN` (la crea Vercel), `SESSION_SECRET` y `SETUP_CODE`.

**Probar localmente:**
```bash
npm install
```
```bash
npx vercel env pull .env.local
```
```bash
npx vercel dev
```
En local, los datos se guardan con el prefijo `dev/`, separados de producción (`prod/`).

## Estructura
| Archivo | Contenido |
|---|---|
| `index.html` | Sitio principal |
| `styles.css` | Estilos mobile-first |
| `script.js` | Catálogo, interacción, cotización y registro de pedidos |
| `aviso-privacidad.html` | Aviso de privacidad integral |
| `img/` | Logo y fotos en WebP |
| `admin/` | Panel de administración (HTML, CSS y JS) |
| `api/` | API del panel y de la web: catálogo, pedidos, sesiones, usuarios e imágenes |
| `google-apps-script/` | Opcional: copia de los pedidos en Google Sheets |
| `PROPUESTA.md`, `AUDITORIA.md` | Propuesta de diseño e informe de pruebas |

## Ver localmente
```bash
python -m http.server 5500
```
Después abre http://localhost:5500

## Equipo
Alejandra Cárdenas Siordia · Mitzi Tanairí Hernández · Raúl Ramírez Loce · Andrés Mendoza
