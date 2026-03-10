import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

interface Participante {
  nombreCompleto: string;
  documentoIdentificacion: string;
  cargo: string;
  firma: string | null;
  firmado: boolean;
  esExterno?: boolean;
}

interface Registro {
  fecha: Date | string;
  tema: string;
  facilitadorNombre: string;
  codigo: string;
  version: string;
}

// Mapeo de empresas a logos
const LOGOS: Record<string, string> = {
  'AT': 'Logo1.png',  // Andrés Tobón
  'AP': 'Logo2.png',  // Andrés Publicidad
  'ME': 'Logo3.png',  // María Evangelina
};

// Definición de fuentes
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export const generarActaPDF = async (
  registro: Registro,
  participantes: Participante[],
  empresa: string
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const fechaFormateada = new Date(registro.fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Cargar logo
      let logoContent: TableCell;
      const logoPath = path.join(__dirname, '../../public', LOGOS[empresa] || 'Logo2.png');
      
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        const ext = path.extname(logoPath).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        logoContent = {
          image: `data:${mimeType};base64,${logoBase64}`,
          width: 100,
          height: 60,
          alignment: 'center'
        } as TableCell;
      } else {
        logoContent = {
          text: empresa,
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        } as TableCell;
      }

      // Generar filas de participantes
      const participantRows: TableCell[][] = participantes.map((p): TableCell[] => {
        let firmaContent: TableCell;

        if (p.esExterno) {
          firmaContent = { text: 'N/A', alignment: 'center', fontSize: 8, color: '#9e9e9e', margin: [2, 4, 2, 4] } as TableCell;
        } else if (p.firma && p.firmado) {
          try {
            // Asegurar que la firma tenga el formato correcto
            const firmaBase64 = p.firma.includes('base64,') 
              ? p.firma 
              : `data:image/png;base64,${p.firma}`;
            firmaContent = {
              image: firmaBase64,
              width: 80,
              height: 30,
              alignment: 'center',
              margin: [2, 4, 2, 4]
            } as TableCell;
          } catch (e) {
            firmaContent = { text: 'Firmado', alignment: 'center', fontSize: 8, margin: [2, 4, 2, 4] } as TableCell;
          }
        } else {
          firmaContent = { text: '', alignment: 'center', margin: [2, 4, 2, 4] } as TableCell;
        }

        return [
          { text: p.nombreCompleto, fontSize: 8, margin: [2, 8, 2, 8] } as TableCell,
          { text: p.documentoIdentificacion || '', fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell,
          { text: p.cargo || '', fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell,
          firmaContent
        ] as TableCell[];
      });

      // Agregar filas vacías para completar mínimo 10
      const minRows = 10;
      const emptyRowsNeeded = Math.max(0, minRows - participantes.length);
      
      for (let i = 0; i < emptyRowsNeeded; i++) {
        participantRows.push([
          { text: '', margin: [2, 15, 2, 15] } as TableCell,
          { text: '', margin: [2, 15, 2, 15] } as TableCell,
          { text: '', margin: [2, 15, 2, 15] } as TableCell,
          { text: '', margin: [2, 15, 2, 15] } as TableCell
        ]);
      }

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'LETTER',
        pageMargins: [40, 40, 40, 40],
        defaultStyle: {
          font: 'Helvetica'
        },
        content: [
          // ========== ENCABEZADO ==========
          {
            table: {
              widths: [120, '*', 120],
              heights: [70],
              body: [
                [
                  // Logo
                  Object.assign({}, logoContent, { margin: [0, 5, 0, 0] }) as TableCell,
                  // Título
                  {
                    text: 'REGISTRO DE ASISTENCIA',
                    fontSize: 16,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 25, 0, 0]
                  } as TableCell,
                  // Info
                  {
                    table: {
                      widths: ['*'],
                      body: [
                        [{ text: `Código: ${registro.codigo}`, fontSize: 8, border: [false, false, false, true], margin: [2, 2, 2, 2] } as TableCell],
                        [{ text: `Versión: ${registro.version}`, fontSize: 8, border: [false, false, false, true], margin: [2, 2, 2, 2] } as TableCell],
                        [{ text: `Fecha: ${fechaFormateada}`, fontSize: 8, border: [false, false, false, false], margin: [2, 2, 2, 2] } as TableCell]
                      ] as TableCell[][]
                    },
                    layout: 'noBorders'
                  } as TableCell
                ] as TableCell[]
              ] as TableCell[][]
            }
          },
          
          // Línea de separación
          {
            canvas: [
              {
                type: 'line',
                x1: 0, y1: 15,
                x2: 515, y2: 15,
                dash: { length: 5, space: 3 },
                lineWidth: 1
              }
            ]
          },
          
          { text: '', margin: [0, 10, 0, 0] },
          
          // ========== DATOS DEL EVENTO ==========
          {
            table: {
              widths: [140, '*'],
              body: [
                [
                  { text: 'FECHA:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: fechaFormateada, fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[],
                [
                  { text: 'NOMBRE DEL FACILITADOR:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: registro.facilitadorNombre, fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[],
                [
                  { text: 'TEMA:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: registro.tema, fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[]
              ] as TableCell[][]
            }
          },
          
          { text: '', margin: [0, 15, 0, 0] },
          
          // ========== TÍTULO PARTICIPANTES ==========
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'REGISTRO DE ASISTENCIA DE QUIENES PARTICIPARON',
                    bold: true,
                    fontSize: 10,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                    margin: [0, 6, 0, 6]
                  } as TableCell
                ] as TableCell[]
              ] as TableCell[][]
            }
          },
          
          // ========== TABLA DE PARTICIPANTES ==========
          {
            table: {
              headerRows: 1,
              widths: ['35%', '18%', '22%', '25%'],
              body: [
                // Encabezados
                [
                  { text: 'NOMBRES Y APELLIDOS', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'No. CÉDULA', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'CARGO', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'FIRMA', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell
                ] as TableCell[],
                // Datos de participantes
                ...participantRows
              ] as TableCell[][]
            }
          }
        ]
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};

