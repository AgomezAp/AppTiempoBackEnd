import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

/**
 * Autentica con Google Sheets usando credenciales de cuenta de servicio
 */
const authenticateGoogleSheets = () => {
  const auth = new JWT({
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
  return Math.ceil(day / 7);
};

/**
 * Obtiene el nombre del mes en español
 */
const getMonthName = (fecha: Date): string => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[fecha.getMonth()];
};

/**
 * Encuentra o crea una hoja para la semana específica
 */
const getOrCreateWeekSheet = async (fecha: Date) => {
  const sheets = authenticateGoogleSheets();
  const weekNumber = getWeekOfMonth(fecha);
  const monthName = getMonthName(fecha);
  const year = fecha.getFullYear();
  const sheetName = `Semana ${weekNumber} - ${monthName} ${year}`;

  try {
    // Obtener todas las hojas existentes
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    );

    if (existingSheet) {
      return sheetName;
    }

    // Crear nueva hoja si no existe
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
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
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['Fecha', 'Nombre', 'Documento', 'Tipo', 'Hora Entrada', 'Hora Salida', 'Observaciones'],
        ],
      },
    });

    return sheetName;
  } catch (error) {
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
    const fecha = new Date(permisoData.fecha);
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

    console.log(`Permiso agregado a Google Sheets: ${sheetName}`);
  } catch (error) {
    console.error('Error al agregar permiso a Google Sheets:', error);
    // No lanzar error para no bloquear la creación del permiso
  }
};
