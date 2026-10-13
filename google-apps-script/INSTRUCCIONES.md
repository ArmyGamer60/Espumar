# Registro de pedidos en Google Sheets

Cada vez que un cliente toca **"Enviar por WhatsApp"**, la web:
1. Genera un **folio** (ej. `ESP-261013-W4KT`), que va en el mensaje de WhatsApp.
2. Guarda el pedido en una hoja de Google Sheets con el estado **"Nuevo"**.

La configuración toma unos 10 minutos y solo se hace una vez.

---

## 1. Crear la hoja
1. Entra a [sheets.new](https://sheets.new) con la cuenta de Google del negocio.
2. Ponle de nombre **"Espumar · Pedidos"**.

## 2. Pegar el código
1. En la hoja, abre **Extensiones → Apps Script**.
2. Borra lo que aparece en `Código.gs` y pega **todo** el contenido de `Codigo.gs` (está en esta carpeta).
3. Guarda con el ícono 💾 o con `Ctrl + S`.

## 3. Crear las hojas "Pedidos" y "Detalle"
1. Arriba, en el selector de funciones, elige **`configurarHoja`** y presiona **▶ Ejecutar**.
2. Google pedirá permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a (proyecto) → Permitir**.
   El aviso de "app no verificada" es normal porque el script es tuyo.
3. Regresa a la hoja: verás las pestañas **Pedidos** y **Detalle** con sus encabezados.

> **Opcional:** ejecuta **`probar`** para agregar un pedido de ejemplo y confirmar que todo funciona. Después borra esa fila.

## 4. Publicar como App web
1. En Apps Script, abre **Implementar → Nueva implementación**.
2. En el engrane ⚙ elige el tipo **App web**.
3. Configura:
   - **Ejecutar como:** *Yo*
   - **Quién tiene acceso:** *Cualquier usuario*
4. Presiona **Implementar** y copia la **URL de la App web** (termina en `/exec`).

## 5. Conectar la web
En `script.js`, pega la URL en esta línea (cerca del inicio del archivo):

```js
const SHEETS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

Para comprobarlo, haz un pedido de prueba en la web: en unos segundos debe aparecer en la pestaña **Pedidos**.

---

## Cómo dar seguimiento
| Columna | Uso |
|---|---|
| **Folio** | Búscalo cuando el cliente escriba por WhatsApp (`Ctrl + F` en la hoja). |
| **Estado** | Lista desplegable: Nuevo → Cotizado → Pagado → Enviado → Entregado (o Cancelado). La fila cambia de color. |
| **Seguimiento interno** | Notas del equipo: precio cotizado, fecha de entrega, quién lo atiende, etc. |
| **Acepta promociones** | **Solo envía promociones a quien tenga "Sí".** Así lo exige el aviso de privacidad. Si alguien escribe "BAJA", cámbialo a "No". |

La pestaña **Detalle** tiene una fila por producto. Sirve para hacer una tabla dinámica (Insertar → Tabla dinámica) y ver qué productos, líneas y aromas se piden más.

**Consejo:** usa también **WhatsApp Business** con etiquetas iguales a los estados (Nuevo, Cotizado, Pagado…) para ubicar los chats rápido.

## A tener en cuenta
- Si modificas `Codigo.gs`, publica de nuevo con **Implementar → Administrar implementaciones → ✏ Editar → Versión: Nueva versión**. Así la URL no cambia.
- La hoja registra el pedido cuando el cliente toca "Enviar por WhatsApp" en la web, **aunque después no lo mande en el chat**. Un pedido con estado "Nuevo" que nunca llegó por WhatsApp es un posible cliente para darle seguimiento.
- La URL de la App web es pública. El script solo acepta pedidos con el formato de la web, evita duplicados por folio y bloquea texto que pueda ejecutarse como fórmula. Aun así, no compartas la hoja con permisos de edición fuera del equipo.
- Si `SHEETS_URL` está vacía, la web sigue funcionando: el pedido solo se manda por WhatsApp, con su folio.
