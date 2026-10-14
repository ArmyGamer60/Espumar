# Auditoría del sitio Espumar: pruebas y optimización

**Fecha:** 13 de octubre de 2026
**Cómo se probó:** navegador Chromium con servidor local, en cuatro anchos de pantalla: 320 px (celular pequeño), 375 px (celular), 768 px (tablet) y 1366 px (escritorio). Se midió con la API de rendimiento del navegador y con revisiones automáticas de accesibilidad.

## 1. Resultados: antes y después

| Indicador | Antes | Después | Meta |
|---|---|---|---|
| Peso total de la página | 240 KB | **229 KB** (con más funciones) | < 500 KB |
| Peso real con compresión gzip (HTML + CSS + JS) | — | **~26 KB** | — |
| Peticiones al servidor | 8 | **8** | Mínimas |
| LCP (tiempo en mostrar el contenido principal) | — | **0.62 s** (local) | < 2.5 s |
| CLS (saltos de diseño al cargar) | — | **0** | < 0.1 |
| Desborde horizontal en 320 px | No | No | No |
| Saltos en el orden de encabezados | 2 (h2 → h4) | **0** | 0 |
| Botones y enlaces con menos de 44 px de alto | 4 enlaces "Cotizar línea" (35 px) | **0** | 0 |
| Vista previa al compartir en WhatsApp o redes | No | **Sí** (Open Graph) | Sí |
| Datos estructurados para Google | No | **Sí** (schema.org) | Sí |
| Errores en consola | 0 | 0 | 0 |
| Imágenes sin texto alternativo | 0 | 0 | 0 |

## 2. Hallazgos y correcciones

### Rendimiento
| Hallazgo | Corrección |
|---|---|
| El logo pesaba 32.5 KB y se mostraba a solo 38 px. | Versión de 96 px de **5.9 KB** (−82 %). |
| La imagen principal no tenía prioridad de carga. | `fetchpriority="high"` en la primera imagen del carrusel; `decoding="async"` en las demás. |
| La página brincaba al abrir un modal en escritorio (aparecía y desaparecía la barra de scroll). | `scrollbar-gutter: stable`. |

### Accesibilidad
| Hallazgo | Corrección |
|---|---|
| Los títulos del footer usaban `h4` justo después de un `h2`. | Cambiados a `h3` con la misma apariencia. |
| Los enlaces "Cotizar línea" medían 35 px de alto (difícil tocarlos con el dedo). | Altura mínima de 44 px. |
| Los filtros medían 40 px. | 44 px. |
| El contenedor de los puntos del carrusel tenía `aria-label` pero no `role`. | Se agregó `role="group"`. |
| Los colores nuevos por línea debían cumplir contraste. | Se ajustaron todos a contraste AA (4.5:1 o más sobre blanco). |

### SEO y redes
| Hallazgo | Corrección |
|---|---|
| Al compartir el enlace no aparecía ninguna imagen ni descripción. | Etiquetas Open Graph y Twitter, más una imagen de 1200×630 (`img/og-espumar.jpg`). Esta imagen no la descarga el visitante, solo WhatsApp y las redes al generar la vista previa. |
| Google no tenía datos de la marca. | JSON-LD de `Organization` con teléfono de ventas e Instagram. |

### Errores de diseño encontrados durante las pruebas
- En escritorio, el aviso "Elige un espacio…" de la guía rápida ocupaba solo una columna. Ahora ocupa todo el ancho.
- Los números de los pasos se veían ovalados en tablet y escritorio. Corregido.

## 3. Detalles visuales agregados (sin costo de carga)
Todo se hizo con CSS, SVG en línea o archivos que ya se cargaban. **No hay imágenes, fuentes ni librerías nuevas.**

| Detalle | Técnica | Peso agregado |
|---|---|---|
| Barra de progreso de lectura (arriba) | CSS con animación ligada al scroll, sin JavaScript | ~0.4 KB |
| Sello giratorio "ESPUMAR · PRODUCTOS DE LIMPIEZA" en el hero | Texto SVG en círculo + el mismo logo del header | ~0.8 KB |
| "tu espacio" subrayado con una ola | `text-decoration: wavy` | 0 KB |
| Cifras animadas (4 líneas, 16 productos, 7 aromas) | Se calculan desde el catálogo, así que siempre coinciden | ~1 KB |
| Iconos por línea (auto, casa, playera, dispensador) en filtros, tarjetas, carrusel y productos | 4 símbolos SVG | ~1.2 KB |
| Color de acento por línea (Ropa en lavanda, Personal en azul, etc.) | Variables CSS | ~0.3 KB |
| Bloque "Cómo hacer tu pedido" en 3 pasos, unidos por una línea punteada | HTML + CSS | ~1.5 KB |
| Separadores con la ola del isotipo antes del CTA y del footer | Un solo símbolo SVG reutilizado | ~0.4 KB |
| Brillo mientras cargan las imágenes y aparición con fundido | CSS + 10 líneas de JS | ~0.6 KB |
| Explosión de burbujas al tocar "Agregar" | JS que se elimina solo al terminar | ~0.8 KB |
| Burbujas decorativas en tarjetas de beneficios y en el CTA; iconos que giran al pasar el mouse | CSS | ~0.6 KB |
| Botones circulares de redes en el footer | HTML + CSS | ~0.4 KB |

Todas las animaciones se desactivan si el usuario tiene activada la opción del sistema **"Reducir movimiento"**.

## 4. Segunda auditoría: web + panel de administración (14/10/2026)

**Cómo se probó:**
- Lighthouse en modo celular sobre producción (https://espumar.vercel.app).
- 59 pruebas automáticas de la API contra el almacenamiento real, en el entorno aislado `dev/`.
- Recorrido de cada sección del panel en 375, 768 y 1366 px.
- Recorrido de compra completo: la web envía el pedido y aparece en el panel.

### Lighthouse en producción (celular)
| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Inicio | 97 → **100** | 97 → **100** | 100 | 100 |
| Aviso de privacidad | 100 | 100 | 100 | 63 → **100** |
| Panel `/admin` | 100 | 100 | 96 → **100** | 54 → 63* |

\* El panel está marcado a propósito como "no indexar", para que no aparezca en Google.

### Errores encontrados y corregidos
| Severidad | Hallazgo | Corrección |
|---|---|---|
| Alta | Guardar el catálogo o la información por segunda vez siempre daba "otra persona modificó estos datos". El almacenamiento devuelve la versión en forma "débil" (`W/"…"`) al leer y espera la forma fuerte al escribir. | La versión se normaliza al leer. Se agregaron pruebas de "leer y luego guardar". |
| Alta (seguridad) | La sesión de un usuario eliminado seguía sirviendo si se creaba otro usuario con el mismo nombre. | La sesión se ata a la fecha de creación del usuario. Hay una prueba de regresión. |
| Media | En la web, los productos sin aromas mostraban la etiqueta "Aroma" vacía. | Solo se muestra si hay aromas. |
| Baja | Los eventos de una sección del panel seguían activos en la siguiente. | Se limpian al cambiar de sección. |
| Baja | Al entrar al panel sin sesión aparecía un error 401 en consola. | `/api/auth/me` responde 200 con `user: null`. |

### Ajustes de diseño
- **Pedidos:** el nombre y el estado van arriba, y el folio ya no se corta.
- **Catálogo en celular:** los controles pasan a una barra inferior, así los nombres de producto se leen completos.
- **Botones de las hojas:** ya no saltan de línea.
- **Aviso de guardado:** flota sobre la barra inferior en lugar de taparla.
- **Miniaturas de imagen:** son cuadradas.
- **Lista de roles:** quedó alineada.
- **Puntos del carrusel:** tienen un área táctil de 32×28 px, lo que exige Lighthouse.
- **Usuarios nuevos:** se crean con el rol Ventas por defecto, el de menos permisos.

## 5. Pendientes recomendados (antes de publicar)
1. ~~**Aviso de privacidad.**~~ ✅ **Hecho.** Se agregaron:
   - El aviso integral en `aviso-privacidad.html`, conforme a la nueva LFPDPPP (DOF 20/03/2025).
   - El aviso simplificado junto al botón "Enviar por WhatsApp".
   - Una casilla opcional para aceptar promociones (consentimiento para finalidades secundarias). Se registra en la columna "Acepta promociones" de Google Sheets.
   - Un botón "Borrar mis datos de este dispositivo".
   - Enlaces al aviso en el footer y en las preguntas frecuentes.

   **Falta completar los datos resaltados en amarillo:** responsable, domicilio, correo y plazo de conservación.
2. ~~**Dominio y rutas absolutas.**~~ ✅ **Hecho.** `og:image`, `og:url`, `canonical` y el `logo` del JSON-LD apuntan a https://espumar.vercel.app.
3. ~~**Hosting con HTTPS y compresión.**~~ ✅ **Hecho.** El sitio está publicado en Vercel con HTTPS y compresión. Las imágenes tienen caché de 7 días (`vercel.json`), y cada `git push` a `main` vuelve a desplegar el sitio automáticamente.
4. **Lighthouse en producción.** Volver a medir con PageSpeed Insights una vez publicado, simulando una conexión 4G. Las cifras de arriba son con servidor local.
5. **Pruebas con usuarios reales.** Pedir a 3 a 5 personas del público objetivo que hagan un pedido desde su celular. Medir cuánto tardan y dónde dudan.
6. **Fotos por producto.** Hoy cada producto usa el icono de su línea. Si se toman fotos individuales, convertirlas a WebP de ~400 px (unos 20 KB cada una).
