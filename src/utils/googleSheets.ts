import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

/**
 * Autentica con Google Sheets usando credenciales de cuenta de servicio
 */
const authenticateGoogleSheets = () => {
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

/**
 * Determina el número de semana del mes (1-4) basado en la fecha
 */
const getWeekOfMonth = (fecha: Date): number => {
  const day = fecha.getDate();
  // Obtener el día de la semana del primer día del mes (0=domingo..6=sábado)
  const firstDay = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const firstWeekday = firstDay.getDay();
  // Calcular la semana del mes considerando semanas que empiezan en domingo
  // Ejemplo: si el mes empieza en jueves (4) y el día es 11 -> (11 + 4)/7 = 15/7 = 2.14 -> ceil = 3
  return Math.ceil((day + firstWeekday) / 7);
};

/**
 * Obtiene el nombre del mes en español
 */
const getMonthName = (fecha: Date): string => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[fecha.getMonth()];
};

// Convierte índice 0-based a letra de columna (0 -> A)
const colIndexToLetter = (index: number) => {
  let letter = '';
  let i = index + 1;
  while (i > 0) {
    const mod = (i - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    i = Math.floor((i - mod) / 26);
  }
  return letter;
};

/**
 * Actualiza/añade un resumen en columnas empezando desde la columna L:
 * - Si ya existe una columna con la fecha (fila 1), añade el detalle en la primer fila vacía desde la fila 2.
 * - Si no existe, usa la siguiente columna libre desde L, escribe la fecha en fila1 y el detalle en fila2.
 */
const updateSummaryInColumnL = async (sheetName: string, fechaFormateada: string, permisoData: any, targetSpreadsheetId: string = SPREADSHEET_ID) => {
  const sheets = authenticateGoogleSheets();
  // Leer encabezados desde L1 hasta AZ1 (suficiente rango amplio)
  const startColIndex = 11; // L = 12th column -> index 11
  const headerRange = `${sheetName}!L1:AZ1`;
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSpreadsheetId, range: headerRange });
  const headers = (headerRes.data.values && headerRes.data.values[0]) ? headerRes.data.values[0] : [];
  // Convertir fecha dd/mm/yyyy a Date
  const parseFecha = (s: string) => {
    const parts = String(s).split('/');
    if (parts.length !== 3) return null;
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  };

  // Construir array de fechas existentes junto con su índice
  const headerDates: Array<{ idx: number; date: Date | null; raw: string }> = headers.map((h: string, i: number) => ({ idx: i, date: parseFecha(h), raw: h }));

  const targetDate = parseFecha(fechaFormateada);
  // Si no se pudo parsear targetDate, fallback a comportamiento anterior: usar primera columna libre
  if (!targetDate) {
    let colOffset = headers.findIndex((h: string) => !h || String(h).trim() === '');
    colOffset = colOffset === -1 ? headers.length : colOffset;
    const targetColIndex = startColIndex + colOffset;
    const targetColLetter = colIndexToLetter(targetColIndex);
    await sheets.spreadsheets.values.update({ spreadsheetId: targetSpreadsheetId, range: `${sheetName}!${targetColLetter}1`, valueInputOption: 'RAW', requestBody: { values: [[fechaFormateada]] } });
    const detail = buildDetailTexto(permisoData);
    await sheets.spreadsheets.values.update({ spreadsheetId: targetSpreadsheetId, range: `${sheetName}!${targetColLetter}2`, valueInputOption: 'RAW', requestBody: { values: [[detail]] } });
  } else {
    // Buscar si ya existe columna con la misma fecha exacta
    const existing = headerDates.find(hd => hd.raw === fechaFormateada);
    if (existing) {
      const colOffset = existing.idx;
      const targetColIndex = startColIndex + colOffset;
      const targetColLetter = colIndexToLetter(targetColIndex);
      // encontrar primera fila vacía desde la fila 2
      const colRange = `${sheetName}!${targetColLetter}2:${targetColLetter}`;
      const colRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSpreadsheetId, range: colRange });
      const colValues = colRes.data.values || [];
      let emptyRow = 2;
      for (let i = 0; i < colValues.length; i++) {
        const v = colValues[i]?.[0];
        if (!v || v === '') { emptyRow = 2 + i; break; }
        emptyRow = 2 + i + 1;
      }
      const detail = buildDetailTexto(permisoData);
      await sheets.spreadsheets.values.update({ spreadsheetId: targetSpreadsheetId, range: `${sheetName}!${targetColLetter}${emptyRow}`, valueInputOption: 'RAW', requestBody: { values: [[detail]] } });
    } else {
      // No existe: calcular posición de inserción para mantener headers ordenados ascendente
      // Encontrar el primer header cuya fecha sea mayor que targetDate
      let insertAt = headerDates.findIndex(hd => hd.date !== null && (hd.date as Date).getTime() > targetDate.getTime());
      if (insertAt === -1) insertAt = headers.length; // al final

      // Insertar columna en la posición (startColIndex + insertAt)
      const meta = await sheets.spreadsheets.get({ spreadsheetId: targetSpreadsheetId });
      const sheetMeta = meta.data.sheets?.find(s => s.properties?.title === sheetName);
      const sheetId = sheetMeta?.properties?.sheetId;
      if (sheetId === undefined) throw new Error('No sheetId');

      const insertIndex = startColIndex + insertAt;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: targetSpreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: insertIndex,
                  endIndex: insertIndex + 1,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });

      const targetColLetter = colIndexToLetter(insertIndex);
      // Escribir fecha y detalle
      await sheets.spreadsheets.values.update({ spreadsheetId: targetSpreadsheetId, range: `${sheetName}!${targetColLetter}1`, valueInputOption: 'RAW', requestBody: { values: [[fechaFormateada]] } });
      const detail = buildDetailTexto(permisoData);
      await sheets.spreadsheets.values.update({ spreadsheetId: targetSpreadsheetId, range: `${sheetName}!${targetColLetter}2`, valueInputOption: 'RAW', requestBody: { values: [[detail]] } });

      // Aplicar formato (wrap + ancho) a la nueva columna
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: targetSpreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: insertIndex, endColumnIndex: insertIndex + 1 },
                  cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
                  fields: 'userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment',
                },
              },
              {
                updateDimensionProperties: {
                  range: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: insertIndex, endIndex: insertIndex + 1 },
                  properties: { pixelSize: 280 },
                  fields: 'pixelSize',
                },
              },
            ],
          },
        });
      } catch (err) {
        console.warn('No se pudo formatear columna insertada:', err);
      }
    }
  }

  // Formateo final ya se aplica en las ramas donde se inserta/usa la columna.
};

const buildDetailTexto = (permisoData: any) => {
  // Construir el texto del permiso sin incluir el número de documento
  const parts: string[] = [];
  if (permisoData.nombre) parts.push(permisoData.nombre);
  if (permisoData.tipo) parts.push(`Tipo: ${permisoData.tipo}`);
  if (permisoData.horaEntrada) parts.push(`Entrada: ${permisoData.horaEntrada}`);
  if (permisoData.horaSalida) parts.push(`Salida: ${permisoData.horaSalida}`);
  if (permisoData.observaciones) parts.push(permisoData.observaciones);
  return parts.join('\n');
};

/**
 * Aplica wrap (ajustar texto) a las columnas A:G de la hoja indicada.
 */
const applyWrapToMainTable = async (sheetName: string, targetSpreadsheetId: string = SPREADSHEET_ID) => {
  const sheets = authenticateGoogleSheets();
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: targetSpreadsheetId });
    const sheetMeta = meta.data.sheets?.find(s => s.properties?.title === sheetName);
    const sheetId = sheetMeta?.properties?.sheetId;
    if (sheetId === undefined) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: targetSpreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1000,
                startColumnIndex: 0,
                endColumnIndex: 7,
              },
              cell: {
                userEnteredFormat: {
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                },
              },
              fields: 'userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment',
            },
          },
        ],
      },
    });
  } catch (err) {
    console.warn('No se pudo aplicar wrap a A:G:', err);
  }
};

/**
 * Encuentra o crea una hoja para la semana específica
 */
const getOrCreateWeekSheet = async (fecha: Date, targetSpreadsheetId: string = SPREADSHEET_ID) => {
  const sheets = authenticateGoogleSheets();
  const weekNumber = getWeekOfMonth(fecha);
  const monthName = getMonthName(fecha);
  const year = fecha.getFullYear();
  const sheetName = `Semana ${weekNumber} - ${monthName} ${year}`;

  try {
    // Obtener todas las hojas existentes
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    );

    if (existingSheet) {
      console.log(`✓ Usando hoja existente: ${sheetName}`);
      return sheetName;
    }

    // Crear nueva hoja si no existe
    console.log(`→ Creando nueva hoja: ${sheetName}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: targetSpreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    // Agregar encabezados a la nueva hoja
    await sheets.spreadsheets.values.update({
      spreadsheetId: targetSpreadsheetId,
      range: `${sheetName}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['Fecha', 'Nombre', 'Documento', 'Tipo', 'Hora Entrada', 'Hora Salida', 'Observaciones'],
        ],
      },
    });

    // Aplicar wrap (ajustar texto) a las columnas principales A:G
    try {
      await applyWrapToMainTable(sheetName, targetSpreadsheetId);
    } catch (err) {
      console.warn('No se pudo aplicar wrap al crear la hoja:', err);
    }

    console.log(`✓ Hoja creada con éxito: ${sheetName}`);
    return sheetName;
  } catch (error: any) {
    // Si el error es que la hoja ya existe (por solicitudes simultáneas), simplemente retornar el nombre
    if (error?.message?.includes('already exists')) {
      console.log(`✓ La hoja ya fue creada por otra solicitud: ${sheetName}`);
      return sheetName;
    }
    console.error('Error al obtener/crear hoja:', error);
    throw error;
  }
};

/**
 * Agrega un permiso a la hoja de Google Sheets
 */
export const appendPermisoToSheet = async (permisoData: {
  fecha: string;
  nombre: string;
  numeroDocumento: string;
  tipo: string;
  horaEntrada: string;
  horaSalida: string;
  observaciones: string;
}) => {
  try {
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
      console.warn('Google Sheets no configurado. Saltando integración.');
      return;
    }

    const sheets = authenticateGoogleSheets();
    // Crear fecha desde string ISO agregando la hora para evitar problemas de zona horaria
    const fecha = new Date(permisoData.fecha + 'T12:00:00');
    const sheetName = await getOrCreateWeekSheet(fecha);

    // Formatear fecha para mostrar
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;

    // Agregar fila con datos del permiso
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:G`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            fechaFormateada,
            permisoData.nombre,
            permisoData.numeroDocumento,
            permisoData.tipo,
            permisoData.horaEntrada,
            permisoData.horaSalida,
            permisoData.observaciones,
          ],
        ],
      },
    });

    // Asegurar que la tabla principal A:G tenga ajuste de texto
    try {
      await applyWrapToMainTable(sheetName);
    } catch (err) {
      console.warn('Error aplicando wrap a A:G:', err);
    }

    // Actualizar resumen en columnas empezando en L (fecha en fila1, detalle en filas siguientes, sin cédula)
    try {
      await updateSummaryInColumnL(sheetName, fechaFormateada, permisoData);
    } catch (err) {
      console.warn('Error actualizando resumen en L:', err);
    }

    console.log(`Permiso agregado a Google Sheets: ${sheetName}`);
  } catch (error) {
    console.error('Error al agregar permiso a Google Sheets:', error);
    // No lanzar error para no bloquear la creación del permiso
  }
};
