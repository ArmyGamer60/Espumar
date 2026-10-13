# Espumar: propuesta de web interactiva

## Punto de partida
- **Base recibida:** `ESPUMAR.HTML.rtf`, `CSS.ESPUMAR.rtf`, `JAVASCRIPT.ESPUMAR.rtf`. Una one-page con hero, filtro de 4 categorías y enlaces a WhatsApp. Venía en formato RTF, así que no se podía abrir como página web.
- **Contexto (PDF, Semana 7, UTEL):** marca de limpieza "premium accesible", con 4 líneas (Automotriz, Hogar, Ropa y Personal). Público B2C (25 a 55 años) y B2B ligero (talleres y pequeños negocios). Necesidades: claridad de uso, compra sin registro y **experiencia móvil rápida**. Objetivo comercial: conversión directa por WhatsApp.

## Qué se construyó
Archivos funcionales: `index.html`, `styles.css`, `script.js` y la carpeta `img/` (logo y fotos del PDF en WebP, unos 180 KB en total).

| Sección (arquitectura del PDF) | Interactividad |
|---|---|
| Header | Menú hamburguesa en celular; en escritorio, menú en línea que resalta la sección activa. Botón "Mi cotización" con contador. |
| Hero | Eslogan, botones de acción y burbujas animadas. Carrusel de líneas: se desliza con el dedo en celular y muestra tarjetas apiladas en escritorio. |
| Catálogo (4 líneas) | Filtro de la base mejorado. "Ver productos" abre una hoja con los productos de la línea, donde se elige presentación, aroma y cantidad y se agregan a la cotización. |
| Guía rápida | "¿Qué quieres limpiar hoy?": eliges un espacio (cocina, baño, motor…) y te recomienda productos. Responde a la necesidad de "claridad sin textos técnicos". |
| Beneficios | Fórmulas concentradas, aromas, compra directa y envase reciclable. |
| Nosotros | Pestañas "Para tu hogar" / "Para tu negocio" (B2C/B2B) con su propio botón de WhatsApp, más preguntas frecuentes en acordeón. |
| Contacto / footer | WhatsApp, teléfono, Instagram @espumar.mx y accesos a cada línea. |
| **Mi cotización** | Lista sin registro que se guarda en el dispositivo. Botón "Enviar por WhatsApp" que arma el mensaje con productos, presentación, aroma, cantidad, nombre, tipo de cliente y notas. |

## Seguimiento de pedidos (folio + Google Sheets)
- Al enviar, se genera un **folio** `ESP-AAMMDD-XXXX` que se incluye en el mensaje de WhatsApp. Después se muestra una pantalla de confirmación con el folio, un botón para copiarlo y otro para reabrir WhatsApp. La lista se vacía y el último folio queda visible en "Mi cotización".
- El pedido se registra en **Google Sheets** mediante Google Apps Script (`google-apps-script/Codigo.gs`):
  - Pestaña **Pedidos**: una fila por pedido, con columna **Estado** (Nuevo, Cotizado, Pagado, Enviado, Entregado, Cancelado) y colores por estado.
  - Pestaña **Detalle**: una fila por producto, para análisis de ventas.
- Configuración: `google-apps-script/INSTRUCCIONES.md`. La URL se pega en `SHEETS_URL` dentro de `script.js`.

## Decisiones de diseño
- **Mobile-first:** el CSS base es para celular. En celular, las hojas de producto salen desde abajo (*bottom sheet*), se cierran deslizando hacia abajo y los botones flotantes quedan al alcance del pulgar. Puntos de quiebre: `640px` (tablet: modal centrado y cotización en panel lateral) y `960px` (escritorio: menú en línea, 4 columnas, carrusel apilado y efectos *hover*).
- **Sistema de diseño del PDF:** teal #1F6B75 / #165058, fondos #FFFFFF / #F8FAFB, textos #1A2327 / #5A6A72 y tipografía del sistema (sin descargas). Se añadió el turquesa de la ola del isotipo (#7CC4E4) como acento.
- **Rendimiento ("interfaz ultraligera"):** sin librerías ni fuentes externas, iconos SVG en línea, imágenes WebP con carga diferida.
- **Accesibilidad:** enlace para saltar al contenido, foco visible, `aria-*` en filtros, pestañas y carrusel, diálogos nativos (`<dialog>`) que se cierran con Esc y respeto de la preferencia "reducir movimiento".

## Cómo verlo
Abre `index.html` en el navegador o, para probarlo como en un servidor, ejecuta:

```
python -m http.server 5500
```

y entra a http://localhost:5500

## Privacidad (LFPDPPP 2025)
- Aviso integral en `aviso-privacidad.html` y aviso simplificado dentro de "Mi cotización".
- Casilla opcional "Quiero recibir promociones" (consentimiento para finalidades secundarias). Va en el mensaje de WhatsApp y en la columna "Acepta promociones" de la hoja.
- Sin cookies ni analítica. Botón para que el usuario borre lo guardado en su dispositivo.

## Pendiente para validar con el equipo
- Crear el Google Sheet, publicar el Apps Script y pegar la URL en `SHEETS_URL`.
- Completar en `aviso-privacidad.html` los datos resaltados: responsable, domicilio, correo y plazo de conservación.
- Precios: el sitio cotiza por WhatsApp y no muestra precios.
- Presentaciones y aromas por producto: son una propuesta; se editan en `PRODUCTS` dentro de `script.js`.
- Fotos individuales por producto: hoy se usan las fotos por línea del PDF.
