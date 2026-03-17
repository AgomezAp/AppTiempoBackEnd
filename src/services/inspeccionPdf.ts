import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
};

const printer = new PdfPrinter(fonts);

interface SeccionReporte {
    titulo: string;
    preguntas: {
        texto: string;
        tipo: string;
        valor: string | null;
        puntos: number;
        pesoMax: number;
        observacion: string | null;
        conforme: boolean;
    }[];
    puntosObtenidos: number;
    puntosMaximos: number;
}

export const generarPdfInspeccion = (inspeccion: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const porcentaje = inspeccion.porcentaje || 0;
            const aprobada = inspeccion.aprobada;
            const colorResultado = aprobada ? '#27ae60' : '#e74c3c';

            // Agrupar respuestas por sección
            const seccionesMap = new Map<number, SeccionReporte>();
            const respuestas = inspeccion.respuestas || [];

            for (const resp of respuestas) {
                const seccionId = resp.seccionId;
                const seccion = resp.seccion || {};
                const pregunta = resp.pregunta || {};

                if (!seccionesMap.has(seccionId)) {
                    seccionesMap.set(seccionId, {
                        titulo: seccion.titulo || 'Sin sección',
                        preguntas: [],
                        puntosObtenidos: 0,
                        puntosMaximos: 0,
                    });
                }

                const sec = seccionesMap.get(seccionId)!;
                const pesoMax = (seccion.peso || 1) * (pregunta.peso || 1);
                const conforme = resp.puntos >= pesoMax * 0.5;

                sec.preguntas.push({
                    texto: pregunta.texto || '',
                    tipo: pregunta.tipo || 'si_no',
                    valor: resp.valor,
                    puntos: resp.puntos,
                    pesoMax,
                    observacion: resp.observacion,
                    conforme,
                });
                sec.puntosObtenidos += resp.puntos;
                sec.puntosMaximos += pesoMax;
            }

            const secciones = Array.from(seccionesMap.values());

            // Construir body de secciones
            const seccionesContent: any[] = [];

            for (const sec of secciones) {
                const porcentajeSeccion = sec.puntosMaximos > 0
                    ? Math.round((sec.puntosObtenidos / sec.puntosMaximos) * 100)
                    : 0;

                seccionesContent.push({
                    text: `${sec.titulo} — ${porcentajeSeccion}%`,
                    style: 'seccionTitulo',
                    margin: [0, 10, 0, 5],
                });

                const tableBody: any[][] = [
                    [
                        { text: 'Pregunta', style: 'tableHeader' },
                        { text: 'Respuesta', style: 'tableHeader' },
                        { text: 'Puntos', style: 'tableHeader' },
                        { text: 'Estado', style: 'tableHeader' },
                    ],
                ];

                for (const preg of sec.preguntas) {
                    const valorStr = preg.valor || 'Sin respuesta';
                    const estadoStr = preg.conforme ? 'Conforme' : 'No Conforme';
                    const estadoColor = preg.conforme ? '#27ae60' : '#e74c3c';

                    tableBody.push([
                        { text: preg.texto, fontSize: 8 },
                        { text: valorStr, fontSize: 8 },
                        { text: `${preg.puntos.toFixed(1)}/${preg.pesoMax.toFixed(1)}`, fontSize: 8, alignment: 'center' },
                        { text: estadoStr, fontSize: 8, color: estadoColor, bold: true },
                    ]);

                    if (preg.observacion) {
                        tableBody.push([
                            { text: `  Obs: ${preg.observacion}`, colSpan: 4, fontSize: 7, italics: true, color: '#666' },
                            {}, {}, {},
                        ]);
                    }
                }

                seccionesContent.push({
                    table: {
                        headerRows: 1,
                        widths: ['*', 80, 60, 70],
                        body: tableBody,
                    },
                    layout: 'lightHorizontalLines',
                });
            }

            // Acciones correctivas
            const accionesContent: any[] = [];
            const acciones = inspeccion.acciones || [];
            if (acciones.length > 0) {
                accionesContent.push({
                    text: 'Acciones Correctivas',
                    style: 'seccionTitulo',
                    margin: [0, 15, 0, 5],
                });

                const accionesBody: any[][] = [
                    [
                        { text: 'Descripción', style: 'tableHeader' },
                        { text: 'Prioridad', style: 'tableHeader' },
                        { text: 'Responsable', style: 'tableHeader' },
                        { text: 'Estado', style: 'tableHeader' },
                        { text: 'Fecha Límite', style: 'tableHeader' },
                    ],
                ];

                for (const acc of acciones) {
                    const responsable = acc.responsable
                        ? `${acc.responsable.name} ${acc.responsable.lastName}`
                        : 'Sin asignar';

                    accionesBody.push([
                        { text: acc.descripcion, fontSize: 8 },
                        { text: acc.prioridad, fontSize: 8 },
                        { text: responsable, fontSize: 8 },
                        { text: acc.estado, fontSize: 8 },
                        { text: acc.fechaLimite || 'N/A', fontSize: 8 },
                    ]);
                }

                accionesContent.push({
                    table: {
                        headerRows: 1,
                        widths: ['*', 60, 80, 60, 70],
                        body: accionesBody,
                    },
                    layout: 'lightHorizontalLines',
                });
            }

            const docDefinition: TDocumentDefinitions = {
                content: [
                    { text: 'Reporte de Inspección', style: 'titulo' },
                    {
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    { text: `Título: ${inspeccion.titulo}`, style: 'info' },
                                    { text: `Fecha: ${inspeccion.fechaInspeccion}`, style: 'info' },
                                    { text: `Lugar: ${inspeccion.lugar || 'N/A'}`, style: 'info' },
                                    { text: `Inspector: ${inspeccion.inspector?.name || ''} ${inspeccion.inspector?.lastName || ''}`, style: 'info' },
                                ],
                            },
                            {
                                width: 150,
                                stack: [
                                    {
                                        text: `${porcentaje.toFixed(1)}%`,
                                        fontSize: 28,
                                        bold: true,
                                        color: colorResultado,
                                        alignment: 'center',
                                    },
                                    {
                                        text: aprobada ? 'APROBADA' : 'NO APROBADA',
                                        fontSize: 14,
                                        bold: true,
                                        color: colorResultado,
                                        alignment: 'center',
                                    },
                                    {
                                        text: `${(inspeccion.puntajeObtenido || 0).toFixed(1)} / ${(inspeccion.puntajeMaximo || 0).toFixed(1)} puntos`,
                                        fontSize: 9,
                                        color: '#666',
                                        alignment: 'center',
                                    },
                                ],
                            },
                        ],
                    },
                    { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#ddd' }] },
                    ...seccionesContent,
                    ...accionesContent,
                    ...(inspeccion.observacionesGenerales ? [
                        { text: 'Observaciones Generales', style: 'seccionTitulo', margin: [0, 15, 0, 5] as [number, number, number, number] },
                        { text: inspeccion.observacionesGenerales, fontSize: 9 },
                    ] : []),
                ],
                styles: {
                    titulo: {
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 10],
                    },
                    info: {
                        fontSize: 10,
                        margin: [0, 2, 0, 2],
                    },
                    seccionTitulo: {
                        fontSize: 12,
                        bold: true,
                        color: '#2c3e50',
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 9,
                        color: '#fff',
                        fillColor: '#2c3e50',
                    },
                },
                defaultStyle: {
                    font: 'Helvetica',
                },
                pageSize: 'LETTER',
                pageMargins: [40, 40, 40, 40],
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
