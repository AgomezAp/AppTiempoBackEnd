import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

interface Epp {
  nombre: string;
  categoria: string | null;
}

interface DetalleEntrega {
  cantidad: number;
  talla: string | null;
  epp: Epp;
}

interface Firma {
  tipo: string;
  nombreCompleto: string;
  firma: string | null;
  firmado: boolean;
}

interface Creador {
  name: string;
  lastName: string;
}

interface Entrega {
  id: number;
  fecha: string;
  empresa: string | null;
  observaciones: string | null;
  creador: Creador;
  detalles: DetalleEntrega[];
  firmas: Firma[];
  createdAt: Date;
}

// Mapeo de empresas a logos
const LOGOS: Record<string, string> = {
  'AT': 'Logo1.png',
  'AP': 'Logo2.png',
  'ME': 'Logo3.png',
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

export const generarEntregaEppPDF = async (
  entrega: Entrega
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const fechaFormateada = new Date(entrega.fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Cargar logo
      let logoContent: TableCell;
      const empresaKey = entrega.empresa || '';
      const logoPath = path.join(__dirname, '../../public', LOGOS[empresaKey] || 'Logo2.png');

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
          text: empresaKey || 'EPP',
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        } as TableCell;
      }

      // Generar filas de detalles EPP
      const detalleRows: TableCell[][] = entrega.detalles.map((detalle, index): TableCell[] => {
        return [
          { text: (index + 1).toString(), fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell,
          { text: detalle.epp.nombre, fontSize: 8, margin: [2, 8, 2, 8] } as TableCell,
          { text: detalle.cantidad.toString(), fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell,
          { text: detalle.talla || 'N/A', fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell
        ] as TableCell[];
      });

      // Generar filas de firmas
      const firmaRows: TableCell[][] = entrega.firmas.map((firma): TableCell[] => {
        let firmaContent: TableCell;

        if (firma.firma && firma.firmado) {
          try {
            let firmaBase64 = firma.firma.includes('base64,')
              ? firma.firma
              : `data:image/png;base64,${firma.firma}`;
            // pdfmake solo soporta PNG y JPEG; si el MIME es otro, forzar PNG
            const mimeMatch = firmaBase64.match(/^data:image\/(\w+);base64,/);
            const mime = mimeMatch ? mimeMatch[1].toLowerCase() : 'png';
            if (mime !== 'png' && mime !== 'jpeg' && mime !== 'jpg') {
              firmaBase64 = firmaBase64.replace(/^data:image\/\w+;base64,/, 'data:image/png;base64,');
            }
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
          { text: firma.tipo, fontSize: 8, margin: [2, 8, 2, 8] } as TableCell,
          { text: firma.nombreCompleto, fontSize: 8, margin: [2, 8, 2, 8] } as TableCell,
          firmaContent,
          { text: firma.firmado ? 'Firmado' : 'Pendiente', fontSize: 8, alignment: 'center', margin: [2, 8, 2, 8] } as TableCell
        ] as TableCell[];
      });

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
                    text: 'ACTA DE ENTREGA DE EPP',
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
                        [{ text: 'Código: SST-EPP-001', fontSize: 8, border: [false, false, false, true], margin: [2, 2, 2, 2] } as TableCell],
                        [{ text: 'Versión: 1.0', fontSize: 8, border: [false, false, false, true], margin: [2, 2, 2, 2] } as TableCell],
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
                  { text: 'EMPRESA:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: entrega.empresa || 'No especificada', fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[],
                [
                  { text: 'RESPONSABLE:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: `${entrega.creador.name} ${entrega.creador.lastName}`, fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[],
                [
                  { text: 'OBSERVACIONES:', bold: true, fontSize: 10, fillColor: '#f5f5f5', margin: [5, 8, 5, 8] } as TableCell,
                  { text: entrega.observaciones || 'Ninguna', fontSize: 10, margin: [5, 8, 5, 8] } as TableCell
                ] as TableCell[]
              ] as TableCell[][]
            }
          },

          { text: '', margin: [0, 15, 0, 0] },

          // ========== TÍTULO EPP ==========
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'ELEMENTOS DE PROTECCIÓN PERSONAL ENTREGADOS',
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

          // ========== TABLA DE EPP ==========
          {
            table: {
              headerRows: 1,
              widths: ['10%', '50%', '20%', '20%'],
              body: [
                // Encabezados
                [
                  { text: '#', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'EPP', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'CANTIDAD', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'TALLA', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell
                ] as TableCell[],
                // Datos de detalles
                ...detalleRows
              ] as TableCell[][]
            }
          },

          { text: '', margin: [0, 15, 0, 0] },

          // ========== TÍTULO FIRMAS ==========
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'FIRMAS',
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

          // ========== TABLA DE FIRMAS ==========
          {
            table: {
              headerRows: 1,
              widths: ['20%', '30%', '30%', '20%'],
              body: [
                // Encabezados
                [
                  { text: 'ROL', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'NOMBRE', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'FIRMA', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell,
                  { text: 'ESTADO', bold: true, fontSize: 9, alignment: 'center', fillColor: '#d0d0d0', margin: [2, 6, 2, 6] } as TableCell
                ] as TableCell[],
                // Datos de firmas
                ...firmaRows
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
