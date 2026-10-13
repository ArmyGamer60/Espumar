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

## Estructura
| Archivo | Contenido |
|---|---|
| `index.html` | Sitio principal |
| `styles.css` | Estilos mobile-first |
| `script.js` | Catálogo, interacción, cotización y registro de pedidos |
| `aviso-privacidad.html` | Aviso de privacidad integral |
| `img/` | Logo y fotos en WebP |
| `google-apps-script/` | Script e instrucciones para registrar pedidos en Google Sheets |
| `PROPUESTA.md`, `AUDITORIA.md` | Propuesta de diseño e informe de pruebas |

## Ver localmente
```bash
python -m http.server 5500
```
Después abre http://localhost:5500

## Equipo
Alejandra Cárdenas Siordia · Mitzi Tanairí Hernández · Raúl Ramírez Loce · Andrés Mendoza
