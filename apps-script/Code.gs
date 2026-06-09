/**
 * Manzana Verde · Programa de Socios — Captura de formulario
 * ----------------------------------------------------------
 * Recibe los datos de la landing (landings_catering) y los escribe en el
 * Google Sheet de destino, con UNA PESTAÑA POR PAÍS (Perú / Colombia / México).
 *
 * Sheet destino:
 * https://docs.google.com/spreadsheets/d/1nhyk8wi_RUGe3QLnVhfpqIGHCB3y_cpSNLC6s9U3IZk/edit
 *
 * Despliegue:
 *   1. Abre https://script.google.com y crea un proyecto nuevo.
 *   2. Pega este archivo completo.
 *   3. (Opcional) Ejecuta initSheets() una vez para crear las pestañas y encabezados.
 *   4. Implementar → Nueva implementación → Tipo: "Aplicación web".
 *        - Ejecutar como: Yo (tu cuenta, dueña del Sheet).
 *        - Quién tiene acceso: "Cualquier usuario".
 *   5. Copia la URL que termina en /exec y pégala en index.html
 *      (reemplaza REEMPLAZA_CON_TU_DEPLOYMENT_ID).
 */

var SPREADSHEET_ID = '1nhyk8wi_RUGe3QLnVhfpqIGHCB3y_cpSNLC6s9U3IZk';

// Orden y nombre de las columnas de captura.
var HEADERS = [
  'Fecha',
  'Nombre',
  'Correo',
  'Teléfono',
  'País',
  'Establecimiento',
  'Horario',
  'Dirección',
  'Zona / Distrito',
  'Comentarios'
];

// Países soportados (cada uno es una pestaña). El valor de la landing llega en "pais".
var PAISES = ['Perú', 'Colombia', 'México'];

/** Normaliza el valor de país que envía la landing al nombre exacto de la pestaña. */
function tabPorPais(pais) {
  var p = (pais || '').toString().trim().toLowerCase();
  if (p === 'colombia') return 'Colombia';
  if (p === 'mexico' || p === 'méxico') return 'México';
  if (p === 'peru' || p === 'perú') return 'Perú';
  return 'Otros'; // país no reconocido → pestaña de respaldo
}

/** Devuelve la pestaña del país (la crea con encabezados si no existe). */
function getHojaPais(ss, nombrePais) {
  var hoja = ss.getSheetByName(nombrePais);
  if (!hoja) {
    hoja = ss.insertSheet(nombrePais);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(HEADERS);
    hoja.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#2EAA4A')
        .setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Lógica común para GET y POST. */
function procesar(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita choques entre envíos simultáneos
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    var nombrePais = tabPorPais(params.pais);
    var hoja = getHojaPais(ss, nombrePais);

    var fecha = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'America/Lima', 'yyyy-MM-dd HH:mm:ss');

    var fila = [
      fecha,
      params.nombre || '',
      params.correo || '',
      params.telefono || '',
      params.pais || '',
      params.establecimiento || '',
      params.horario || '',
      params.direccion || '',
      params.zona || '',
      params.comentarios || ''
    ];

    hoja.appendRow(fila);

    // El teléfono se guarda como TEXTO para conservar el "+" y los ceros iniciales
    // (si no, Google Sheets lo interpreta como número y elimina el "+").
    var ultima = hoja.getLastRow();
    hoja.getRange(ultima, 4).setNumberFormat('@').setValue(params.telefono || '');

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, pais: nombrePais }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e)  { return procesar(e); }
function doPost(e) { return procesar(e); }

/**
 * Ejecuta esto UNA vez (botón ▶ en el editor) para dejar las 3 pestañas
 * creadas con sus encabezados desde ya, aunque todavía no haya envíos.
 */
function initSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  PAISES.forEach(function (pais) { getHojaPais(ss, pais); });

  // Si quedó la pestaña por defecto "Hoja 1" / "Sheet1" vacía, la quitamos.
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(h);
    }
  });
}
