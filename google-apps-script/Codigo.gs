/**
 * ESPUMAR — Registro de pedidos en Google Sheets
 *
 * Recibe los pedidos que envía la web (script.js → logOrder) y los guarda en:
 *   - "Pedidos": una fila por pedido, con columna de Estado para dar seguimiento.
 *   - "Detalle": una fila por producto (sirve para ver qué se vende más).
 *
 * Instalación: ver INSTRUCCIONES.md en esta misma carpeta.
 */

const ZONA_HORARIA = 'America/Mexico_City';
const HOJA_PEDIDOS = 'Pedidos';
const HOJA_DETALLE = 'Detalle';
const ESTADOS = ['Nuevo', 'Cotizado', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];
const COLORES_ESTADO = {
  Nuevo: '#fff4ce',
  Cotizado: '#dbeafe',
  Pagado: '#d1fae5',
  Enviado: '#e0e7ff',
  Entregado: '#e5e7eb',
  Cancelado: '#fee2e2'
};

const ENCABEZADOS_PEDIDOS = ['Fecha', 'Folio', 'Nombre', 'Compra para', 'Productos', 'Piezas', 'Notas del cliente', 'Estado', 'Seguimiento interno', 'Acepta promociones'];
const ENCABEZADOS_DETALLE = ['Fecha', 'Folio', 'Línea', 'Producto', 'Presentación', 'Aroma', 'Cantidad'];

/**
 * Ejecútala UNA vez desde el editor (botón ▶ Ejecutar) para crear y dar formato a las hojas.
 */
function configurarHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pedidos = ss.getSheetByName(HOJA_PEDIDOS) || ss.insertSheet(HOJA_PEDIDOS);
  const detalle = ss.getSheetByName(HOJA_DETALLE) || ss.insertSheet(HOJA_DETALLE);

  pedidos.getRange(1, 1, 1, ENCABEZADOS_PEDIDOS.length).setValues([ENCABEZADOS_PEDIDOS]);
  detalle.getRange(1, 1, 1, ENCABEZADOS_DETALLE.length).setValues([ENCABEZADOS_DETALLE]);

  [pedidos, detalle].forEach(hoja => {
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, hoja.getLastColumn())
      .setFontWeight('bold')
      .setBackground('#1f6b75')
      .setFontColor('#ffffff');
  });

  // Lista desplegable de estados
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS, true)
    .setAllowInvalid(false)
    .build();
  pedidos.getRange('H2:H').setDataValidation(regla);

  // Color de toda la fila según el estado
  const rango = pedidos.getRange('A2:J');
  pedidos.setConditionalFormatRules(
    Object.keys(COLORES_ESTADO).map(estado =>
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$H2="${estado}"`)
        .setBackground(COLORES_ESTADO[estado])
        .setRanges([rango])
        .build()
    )
  );

  pedidos.setColumnWidth(2, 150);
  pedidos.setColumnWidth(5, 340);
  pedidos.setColumnWidth(7, 220);
  pedidos.setColumnWidth(9, 260);
  pedidos.getRange('E:E').setWrap(true);
  pedidos.getRange('G:G').setWrap(true);
  detalle.setColumnWidth(4, 220);
}

/**
 * Recibe el pedido desde la web.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const pedido = JSON.parse(e.postData.contents);
    return guardarPedido_(pedido);
  } catch (err) {
    return salida_('error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/** Abrir la URL de la App web en el navegador muestra este texto (sirve para comprobar que está activa). */
function doGet() {
  return salida_('Espumar · registro de pedidos activo');
}

function guardarPedido_(p) {
  // Validaciones: solo se aceptan pedidos con el formato que genera la web
  if (!/^ESP-\d{6}-[A-Z0-9]{4}$/.test(String(p.folio || ''))) return salida_('folio inválido');
  const items = Array.isArray(p.items) ? p.items.slice(0, 50) : [];
  if (!items.length) return salida_('pedido sin productos');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pedidos = ss.getSheetByName(HOJA_PEDIDOS);
  const detalle = ss.getSheetByName(HOJA_DETALLE);
  if (!pedidos || !detalle) return salida_('falta ejecutar configurarHoja()');

  // Evita duplicados si el mismo folio llega dos veces
  if (pedidos.getLastRow() > 1) {
    const folios = pedidos.getRange(2, 2, pedidos.getLastRow() - 1, 1).getValues().map(f => f[0]);
    if (folios.indexOf(p.folio) !== -1) return salida_('duplicado');
  }

  const fecha = Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd HH:mm');
  const tipo = ['Hogar', 'Negocio'].indexOf(p.tipo) !== -1 ? p.tipo : '';

  const resumen = items.map(i => {
    const detalleTxt = [i.presentacion, i.aroma].filter(Boolean).map(v => texto_(v, 40)).join(', ');
    return `${cantidad_(i.cantidad)} × ${texto_(i.producto, 80)}${detalleTxt ? ` (${detalleTxt})` : ''}`;
  }).join('\n');
  const piezas = items.reduce((n, i) => n + cantidad_(i.cantidad), 0);

  // "Acepta promociones": solo enviar promociones a quien tenga "Sí" (consentimiento, LFPDPPP)
  const promos = p.promos === true ? 'Sí' : 'No';
  pedidos.appendRow([fecha, p.folio, texto_(p.nombre, 60), tipo, resumen, piezas, texto_(p.notas, 300), 'Nuevo', '', promos]);

  const filas = items.map(i => [
    fecha, p.folio, texto_(i.linea, 40), texto_(i.producto, 80),
    texto_(i.presentacion, 40), texto_(i.aroma, 40), cantidad_(i.cantidad)
  ]);
  detalle.getRange(detalle.getLastRow() + 1, 1, filas.length, ENCABEZADOS_DETALLE.length).setValues(filas);

  return salida_('ok');
}

/** Limpia texto y evita que se interprete como fórmula (inyección en hojas de cálculo). */
function texto_(valor, max) {
  const s = String(valor == null ? '' : valor).slice(0, max).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function cantidad_(n) {
  return Math.min(999, Math.max(1, parseInt(n, 10) || 1));
}

function salida_(mensaje) {
  return ContentService.createTextOutput(mensaje);
}

/**
 * Prueba desde el editor (▶ Ejecutar "probar"): agrega un pedido de ejemplo a la hoja.
 * Bórralo de la hoja después de comprobar que funciona.
 */
function probar() {
  const respuesta = doPost({
    postData: {
      contents: JSON.stringify({
        folio: 'ESP-000000-TEST',
        nombre: 'Prueba',
        tipo: 'Hogar',
        notas: 'Pedido de prueba',
        promos: true,
        items: [
          { linea: 'Cuidado del Hogar', producto: 'Limpiador multiusos', presentacion: '1 L', aroma: 'Lavanda', cantidad: 2 },
          { linea: 'Cuidado Automotriz', producto: 'Shampoo con cera', presentacion: 'Galón 4 L', aroma: '', cantidad: 1 }
        ]
      })
    }
  });
  Logger.log(respuesta.getContent());
}
