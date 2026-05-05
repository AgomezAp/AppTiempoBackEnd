import { parseStringPromise } from 'xml2js';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import PdfPrinter from 'pdfmake';
import { width } from 'pdfkit/js/page';
import { fontSize } from 'pdfkit';
import { Op } from 'sequelize';
import { HorarioUsuario } from '../models/horarioUsuario';
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Bogota');

export async function processXML(xmlContent: string): Promise<any> {
    try {
        const result = await parseStringPromise(xmlContent);

        const rows = result.Workbook.Worksheet[0].Table[0].Row;
        const data: Array<{ SN: string, Hid: string, Name: string, Open_Time: string, Verify: string }> = [];

        for (let i = 3; i < rows.length; i++) {  // Empezar desde 3 para saltar los primeros elementos
            const cells = rows[i].Cell;
            if (cells.length === 5 || cells.length === 6) {
                const id = cells[1]?.Data?.[0]?._?.trim();
                if (id && id !== '' && !id.includes('User')) {  // Omitir elementos vacíos en el campo ID
                    const entry = {
                        "SN": cells[0]?.Data?.[0]?._ || '',
                        "Hid": id,
                        "Name": cells[2]?.Data?.[0]?._ || '',
                        "Open_Time": cells[3]?.Data?.[0]?._ || '',
                        "Verify": cells[4]?.Data?.[0]?._ || ''
                    };
                    data.push(entry);
                }
            } else {
                console.warn(`Fila ${i} no tiene 5 celdas:`, cells[0].Data[0]._);
            }
        }
        const result_Data = await ordenarDatos(data);
        // console.log(result_Data);
        const result_Extra = sumarExtra(result_Data);

        return [result_Data, result_Extra];
    } catch (error) {
        throw new Error('Error al procesar el archivo XML: ' + error);
    }
}

async function ordenarDatos(data: any): Promise<Array<{Hid: string, Name: string, Entrada: string, Salida: string, Fecha: string , Extra: string  , Total: string, Autocorregido: string}>> {
    const dataf = filtrarProcesar(data);
    const datosp = await procesarDatos(dataf);
    return datosp;
}

function filtrarProcesar(data: Array<{ Hid: string; Name: string; Open_Time: string; Fecha: string }>): Array<{ Hid: string; Name: string; Open_Time: string; Fecha: string }> {
    organizarTiempoMoment(data);
    return data.map(row => ({
        Hid: row.Hid,
        Name: row.Name,
        Open_Time: row.Open_Time,
        Fecha: row.Fecha
    }));
}

function organizarTiempoMoment(data: Array<{ Hid: string; Name: string; Open_Time: string; Fecha: string }>): void {
    data.forEach(item => {
        const openTime = dayjs.tz(item.Open_Time, 'YYYY-MM-DD HH:mm:ss','America/Bogota');
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}

async function procesarDatos(data: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }>): Promise<Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string; Total: string; Autocorregido: string }>> {
    const agrupados: { [key: string]: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> } = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.Hid}`;
        if (!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item);
    });
    const agrupadosLimpios = removeDuplicate(agrupados);

    // Pre-cargar jornadas de todos los usuarios en una sola consulta
    const uniqueHids = [...new Set(data.map(item => item.Hid))];
    const uidsNumeric = uniqueHids.map(h => parseInt(h, 10)).filter(n => !isNaN(n));
    const horariosDB = await HorarioUsuario.findAll({
        where: { Uid: { [Op.in]: uidsNumeric }, activo: true },
    });
    const STANDARD_RESTAR: Record<number, number> = { 1: 570, 2: 570, 3: 570, 4: 570, 5: 570, 6: 240 };
    const jornadaCache = new Map<string, Map<number, number>>();
    for (const hid of uniqueHids) {
        const uid = parseInt(hid, 10);
        const diaMap = new Map<number, number>();
        const userHorarios = horariosDB.filter((h: any) => h.getDataValue('Uid') === uid);
        for (const h of userHorarios) {
            diaMap.set(h.getDataValue('diaSemana'), h.getDataValue('jornadaMinutos') + h.getDataValue('almuerzoMinutos'));
        }
        for (let d = 1; d <= 6; d++) {
            if (!diaMap.has(d)) diaMap.set(d, STANDARD_RESTAR[d]);
        }
        jornadaCache.set(hid, diaMap);
    }

    const datosProcesados: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string; Total: string; Autocorregido: string }> = [];
    let extra: string = '';
    for (const clave in agrupadosLimpios) {
        const grupo: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> = agrupadosLimpios[clave];

        // --- Normalización automática de marcas impares ---
        const correcciones: string[] = [];
        if (grupo.length % 2 !== 0) {
            const primerMarca = dayjs.tz(grupo[0].Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
            const diaSem = primerMarca.day();
            const esSabado = diaSem === 6;

            if (primerMarca.hour() >= 10) {
                // Primera marca es tarde: falta la entrada → insertar 7:30
                const entradaAuto = primerMarca.hour(7).minute(30).second(0).format('YYYY-MM-DD HH:mm:ss');
                grupo.unshift({
                    Fecha: grupo[0].Fecha,
                    Hid: grupo[0].Hid,
                    Open_Time: entradaAuto,
                    Name: grupo[0].Name
                });
                correcciones.push('Entrada auto 07:30');
            } else {
                // Última marca es temprana: falta la salida → insertar 17:00 (o 12:00 sábados)
                const horaSalida = esSabado ? 12 : 17;
                const ultimaMarca = dayjs.tz(grupo[grupo.length - 1].Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
                const salidaAuto = ultimaMarca.hour(horaSalida).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
                grupo.push({
                    Fecha: grupo[0].Fecha,
                    Hid: grupo[0].Hid,
                    Open_Time: salidaAuto,
                    Name: grupo[0].Name
                });
                correcciones.push(`Salida auto ${horaSalida}:00`);
            }
        }

        let sumTotal: string = '0:0';
        for (let i = 0; i < grupo.length; i = i + 2) {
            let primero = grupo[i];
            let ultimo = !grupo[i + 1] ? sinHuella(primero) : grupo[i + 1];
            if (dayjs(primero.Open_Time).isAfter(dayjs(ultimo.Open_Time))) {
                const temp = primero;
                primero = ultimo;
                ultimo = temp;
            }
            const total = formatoHora(difereciaConMoment2(primero, ultimo));
            sumTotal = convertMinutesToTime(convertTimeToMinutes(sumTotal) + convertTimeToMinutes(total));
        }
        const entradaOriginal = grupo[0];
        const salidaFinal = grupo[grupo.length - 1];
        const opentimeEntrada = dayjs.tz(entradaOriginal.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
        const diaSemana = opentimeEntrada.day();
        if (diaSemana !== 6 && diaSemana !== 0) {
            const totalRestar = jornadaCache.get(grupo[0].Hid)?.get(diaSemana) ?? 570;
            extra = extraConvertMinutesToTime(convertTimeToMinutes(sumTotal) - totalRestar);
        } else {
            extra = sumTotal;
        }
        const modificadoextra = (convertTimeToMinutes(extra) >= 0 && convertTimeToMinutes(extra) <= 30) && extra[0] !== '-' ? '0:00' : extra;
        const procesado = {
            Hid: grupo[0].Hid,
            Name: grupo[0].Name,
            Entrada: entradaOriginal.Open_Time,
            Salida: salidaFinal.Open_Time,
            Fecha: grupo[0].Fecha,
            Extra: modificadoextra,
            Total: sumTotal,
            Autocorregido: correcciones.length > 0 ? correcciones.join(', ') : ''
        };
        datosProcesados.push(procesado);
    }
    return datosProcesados;
}

function removeDuplicate(data: any): any {
    Object.keys(data).forEach(clave => {
        data[clave].sort((a: any, b: any) => {
            if (a.Open_Time < b.Open_Time) return -1;
            if (a.Open_Time > b.Open_Time) return 1;
            return 0;
        });
    });
    const cleanedData: any = {}
    for (const datakey in data) {
        const entries = data[datakey]
        const uniqueEntries: any[] = [];
        entries.forEach((entry: any) => {
            const currentTime = new Date(entry.Open_Time).getTime();
            const isDuplicate = uniqueEntries.some(uniqueEntry => {
                const uniqueTime = new Date(uniqueEntry.Open_Time).getTime();
                return Math.abs(currentTime - uniqueTime) <= 900000;
            });
            if (!isDuplicate) {
                uniqueEntries.push(entry);
            }
        });
        cleanedData[datakey] = uniqueEntries
    }
    return cleanedData;
}
export function formatoHora(tiempo: { horas: number, minutos: number }): string {
    const isNegative = tiempo.horas < 0 || (tiempo.horas === 0 && tiempo.minutos < 0);
    const absHoras = Math.abs(tiempo.horas);
    const absMinutos = Math.abs(tiempo.minutos);
    const formatedminutos = absMinutos.toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${absHoras}:${formatedminutos}`;
}

function sinHuella(primero: {Fecha: string; Hid: string; Open_Time: string; Name: string;}): {Fecha: string; Hid: string; Open_Time: string; Name: string;}{
    const ultimo: {Open_Time: string} = { ...primero };
    const openTime = dayjs.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
    let adjustedTime = dayjs.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').hour(17).minute(0).second(0).millisecond(0);

    if (openTime.hour() < 12){
        adjustedTime = openTime.hour(17).minute(0).second(0).millisecond(0);
    } else {
        adjustedTime = openTime.hour(7).minute(30).second(0).millisecond(0);
    }
    ultimo.Open_Time = adjustedTime.format('YYYY-MM-DD HH:mm:ss');
    return {
        Hid: primero.Hid,
        Name: primero.Name,
        Fecha: primero.Fecha,
        Open_Time: ultimo.Open_Time
    };
}

export function difereciaConMoment2(entrada: {Fecha: string; Hid: string; Open_Time: string; Name: string;}, salida: {Fecha: string; Hid: string; Open_Time: string; Name: string;}): {horas: number; minutos: number}{
    let entradaMoment = dayjs.tz(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').set('seconds', 0);
    let entradaMinutos = entradaMoment.minute();
    let salidaMoment = dayjs.tz(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').set('seconds', 0);
    let salidaMinutos = salidaMoment.minute();

    if (entradaMinutos > 0 && entradaMinutos <= 30)  {
        entradaMoment = entradaMoment.set('minute', 30);
    } else if (entradaMinutos > 30 && entradaMinutos <= 59 ) {
        entradaMoment = entradaMoment.set('minute', 0).add(1, 'hour');
    }
    if (salidaMinutos > 0 && salidaMinutos < 30  )  {
        salidaMoment = salidaMoment.set('minute', 0);
    } else if (salidaMinutos >= 30 && salidaMinutos <= 59 ) {
        salidaMoment = salidaMoment.set('minute', 30);
    }
    let duracion = dayjs.duration(salidaMoment.diff(entradaMoment));
    const horas = duracion.hours();
    const minutos = duracion.minutes();
    return { horas, minutos };

}

export function diferenciaUpdate(entrada: Dayjs, salida: Dayjs, hora: number, minuto: number): {horas: number; minutos: number}{
    let duracion = dayjs.duration(salida.diff(entrada));
    duracion = duracion.subtract(hora, 'hours');
    duracion = duracion.subtract(minuto, 'minutes');
    if (duracion.seconds() > 30) {
        duracion = duracion.add(1, 'minutes');
        duracion = duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas: number = duracion.hours();
    const minutos: number = duracion.minutes();
    return { horas, minutos };
}



function sumarExtra(data: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }>): Array<{ Sid: string; Name: string; Acumulado: string }> {
    const acumulado: { [key: string]: { totalMinutos: number; Name: string } } = {};

    data.forEach(item => {
        const totalMinutos = convertTimeToMinutes(item.Extra);

        if (!acumulado[item.Hid]) {
            acumulado[item.Hid] = { totalMinutos, Name: item.Name };
        } else {
            acumulado[item.Hid].totalMinutos += totalMinutos;
        }
    });

    const resultado = Object.entries(acumulado).map(([Hid, { totalMinutos, Name }]) => {
        const horas = Math.floor(Math.abs(totalMinutos) / 60);
        const minutos = Math.abs(totalMinutos % 60);
        const sign = totalMinutos < 0 ? '-' : '';

        return {
            Sid: Hid,
            Name,
            Acumulado: `${sign}${horas}:${minutos.toString().padStart(2, '0')}`,
        };
    });

    return resultado;
}

export function convertTimeToMinutes(time: string): number {
    if (!time || !time.includes(':')) return NaN;
    const isNegative = time.startsWith('-');
    const clean = time.replace('-', '');
    const parts = clean.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return NaN;
    const total = hours * 60 + minutes;
    return isNegative ? -total : total;
}

export function convertMinutesToTime(minutes: number): string {
    let horas = 0;
    if(minutes < 0){
        horas = -Math.floor(Math.abs(minutes) / 60);
    } else {
        horas = Math.floor(minutes / 60);
    }
    const minutos = minutes % 60;
    return formatoHora({ horas, minutos });
}

export function extraConvertMinutesToTime(minutes: number): string {
    const horas = Math.floor(Math.abs(minutes) / 60);
    const minutos = Math.abs(minutes % 60);
    const formatedminutos = minutos.toString().padStart(2, '0');

    // Si los minutos originales son negativos, el resultado también debe ser negativo
    const sign = minutes < 0 ? '-' : '';

    return `${sign}${horas}:${formatedminutos}`;
}

export async function informePersonal(horario: Array<{Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string}>): Promise<Buffer> {
    const fonts = {
        Helvetica: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
        }
    };
    const informePersonal = new PdfPrinter(fonts);
    const contenido = [
        {
            columns: [
                {image: 'public/LogoAP.png', width: 50},
                {text: "Informe de entradas y salidas\n", style: "header", alignment:'center'}
            ]
        },
        {
            table: {
                headerRows: 1,
                widths: [150, '*', '*', 100,],
                heigths: [200],
                body: [
                    [
                        {text: "Nombre", style: "tableHeader", alignment: 'center'},
                        {text: "Entrada", style: "tableHeader", alignment: 'center'},
                        {text: "Salida", style: "tableHeader", alignment: 'center'},
                        {text: "Fecha", style: "tableHeader", alignment: 'center'},

                    ],
                    ...horario.map((registro) => [
                        { text: registro.Name, style: "tableCell", alignment: 'center'},
                        { text: registro.Entrada, style: "tableCell", alignment: 'center'},
                        { text: registro.Salida, style: "tableCell", alignment: 'center'},
                        { text: registro.Fecha, style: "tableCell", alignment: 'center'},
                    ]),
                ],
            },
            layout: {
                fillcolor: (rowIndex: number) => (rowIndex === 0 ? '#CCCCCC': null),
                vLineWidth: (i: number, node: any) => 0.5,
                hLineWidth: (i: number, node: any) => 0.5,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 5,
                paddingBottom: () => 5,
            },
        },

    ];
    const estilos = {
        header:{
            fontSize: 20,
            bold: true,
            margin: [0, 10, 0, 15] as [number, number, number, number],
        },
        tableHeader: {
            bold: true,
            fontSize: 12,
            color: "white",
            fillColor: '#4CAF50',
            alignment: "center"
        },
        tableCell: {
            color: 'black',
            fontSize: 15,
        }
    };

    const docDefinition = {
        content: contenido,
        styles: estilos,
        defaultStyle: {
            font: "Helvetica"
        },
        background: {
            image: 'public/LogoAP.png',
            width: 400,
            opacity: 0.2,
            alignment:'center',
            absolutePosition: {x: 10 , y: 300},
        }
    };

    const pdfDoc = informePersonal.createPdfKitDocument(docDefinition as any);

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on("data",(chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (err)=> reject(err));
        pdfDoc.end();
    });
}

export async function informeNovedades(novedad: Array<{Nid: number; Name: string; type:string; description:string}>): Promise<Buffer> {
    const fonts = {
        Helvetica: {
            normal: "Helvetica",
            bold: "Helvetica-Bold",
            italics: "Helvetica-Oblique",
            bolditalics: "Helvetica-BoldOblique"
        }
    };
    const printer = new PdfPrinter(fonts);
    const processLongText = (text: string) => {
        return {
            text: text,
            fontSize: 10,  // Reducir tamaño para contenido largo
            margin: [2, 2, 2, 2]
        };
    };
    const content = [
        {
            columns: [
                {image: 'public/LogoAP.png', width: 50},
                {text: "Informe de Novedades\n", style: "header", alignment:'center'}
            ],
        },
        {
            table: {
                headerRows: 1,
                widths: ["auto","auto","*"],
                body: [
                    [
                        {text: "Nombre", style: "tableHeader", alignment: "center"},
                        {text: "Tipo", style: "tableHeader", alignment: "center"},
                        {text: "Descripcion", style: "tableHeader", alignment: "center"},
                    ],

                    // ...novedad.map((item ) => [
                    //     {text: item.Name, style: "tableCell", alignment:"center"},
                    //     {text: item.type, style: "tableCell", alignment:"center"},
                    //     {text: item.description, style: "tableCell", alignment:"center"},
                    // ]),
                    ...novedad.map((item) => [
                        processLongText(item.Name),
                        processLongText(item.type),
                        processLongText(item.description),
                    ])
                ],
            },
            layout: {
                fillColor: (rowIndex: number) => (rowIndex === 0 ? "#CCCCCC":null),
                vLineWidth: () => 0.5,
                hLineWidth: () => 0.5,
                vLineColor: () => "#000000",
                hLineColor: () => "#000000",
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 3,
                paddingBottom: () => 3,
                defaultBorder: true,
                wordBreak: 'break-word'
            },
            width: '100%'
        },
    ];
    const styles = {
        header: {
            fontSize: 20,
            bold: true,
            margin: [0, 10, 0, 15] as [number,number,number,number],
        },
        tableHeader: {
            bold: true,
            fontSize: 12,
            color: "white",
            fillColor: "#4CAF50",
            alignment: "center",
        },
        tableCell: {
            color: "black",
            fontSize: 10,
            lineHeight: 1.2
        },
    };
    const docDefinition = {
        content,
        styles,
        defaultStyle: {
            font: "Helvetica",
            fontSize: 10,
            lineHeight: 1.2
        },
        pageMargins: [20, 40, 20, 40],
        pageSize: 'A4',
        pageOrientation: 'portrait',
        background: {
            image: "public/LogoAP.png",
            width: 400,
            opacity: 0.2,
            alignment: "center",
            absolutePosition: {x: 10, y: 300},
        },
    };
    const pdfDoc = printer.createPdfKitDocument(docDefinition as any);
    return new Promise<Buffer>((resolve, reject)=> {
        const chunks: any[]= []
        pdfDoc.on("data", (chunk)=> chunks.push(chunk))
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (err)=> reject(err));
        pdfDoc.end();
    })
}

export async function informeNovedadNuevo(novedades: Array<{Sid: string; Name: string; Acumulado: string; Descripciones: Array<{Fecha: string; Descripcion: string;}>}>) {
    const fonts = {
        Helvetica: {
            normal: "Helvetica",
            bold: "Helvetica-Bold",
            italics: "Helvetica-Oblique",
            bolditalics: "Helvetica-BoldOblique"
        }
    };
    const printer = new PdfPrinter(fonts);
    const processLongText = (text: string) => {
        return {
            text: text,
            fontSize: 10,  // Reducir tamaño para contenido largo
            margin: [2, 2, 2, 2]
        };
    };
    const content = [
        {
            columns: [
                {image: 'public/LogoAP.png', width: 50},
                {text: "Informe de Novedades\n", style: "header", alignment:'center'}
            ],
        },
        {
            table: {
                headerRows: 1,
                widths: ["auto","auto","*"],
                body: [
                    [
                        {text: "Nombre", style: "tableHeader", alignment: "center"},
                        {text: "Acumulado", style: "tableHeader", alignment: "center"},
                        {text: "Descripcion", style: "tableHeader", alignment: "center"},
                    ],
                    ...novedades.map((novedad) => [
                        processLongText(novedad.Name),
                        processLongText(novedad.Acumulado),
                        processLongText(
                            Array.isArray(novedad.Descripciones)
                                ? novedad.Descripciones
                                    .map(desc => `${desc.Fecha} ${String(desc.Descripcion).replace(/[\r\n]+/g, ' ')}`)
                                    .join('\n')
                                : String(novedad.Descripciones).replace(/[\r\n]+/g, ' ')
                        ),
                    ])
                ],
            },
            layout: {
                fillColor: (rowIndex: number) => (rowIndex === 0 ? "#CCCCCC":null),
                vLineWidth: () => 0.5,
                hLineWidth: () => 0.5,
                vLineColor: () => "#000000",
                hLineColor: () => "#000000",
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 3,
                paddingBottom: () => 3,
                defaultBorder: true,
                wordBreak: 'break-word'
            },
            width: '100%'
        },
    ];
    const styles = {
        header: {
            fontSize: 20,
            bold: true,
            margin: [0, 10, 0, 15] as [number,number,number,number],
        },
        tableHeader: {
            bold: true,
            fontSize: 12,
            color: "white",
            fillColor: "#4CAF50",
            alignment: "center",
        },
        tableCell: {
            color: "black",
            fontSize: 10,
            lineHeight: 1.2
        },
    };
    const docDefinition = {
        content,
        styles,
        defaultStyle: {
            font: "Helvetica",
            fontSize: 10,
            lineHeight: 1.2
        },
        pageMargins: [20, 40, 20, 40],
        pageSize: 'A4',
        pageOrientation: 'portrait',
        background: {
            image: "public/LogoAP.png",
            width: 400,
            opacity: 0.2,
            alignment: "center",
            absolutePosition: {x: 10, y: 300},
        },
    };
    const pdfDoc = printer.createPdfKitDocument(docDefinition as any);
    return new Promise<Buffer>((resolve, reject)=> {
        const chunks: any[]= []
        pdfDoc.on("data", (chunk)=> chunks.push(chunk))
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (err)=> reject(err));
        pdfDoc.end();
    })
}
export async function informeRiesgo(horario: Array<{Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string}>): Promise<Buffer> {
    const time = `7:27:59`
    const riesgo = removeBeforeTime(horario, time);
    const riesgoStyle = riesgo.map(ries => {
        let valor = "tableCellCerca";
        const entrada = stringTonumber(ries.Entrada);
        const tarde = stringTonumber('07:31:00');
        if(entrada.hora > 7) {
            valor = "tableCellTarde"
        } else if(entrada.hora == 7) {
            if(entrada.minutos >= 31) {
                valor = "tableCellTarde"
            } else {
                valor = "tableCellCerca"
            }
        }
        return {
            ...ries,
            Valor: valor
        }
    })
    const fonts = {
        Helvetica: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
        }
    };
    const informeRiesgo = new PdfPrinter(fonts);
    const contenido = [
        {
            columns: [
                {image: 'public/LogoAP.png', width: 50},
                {text: "Informe de llegadas\n", style: "header", alignment:'center'}
            ]
        },
        {
            table: {
                headerRows: 1,
                widths: [150, '*', 100,],
                heigths: [200],
                body: [
                    [
                        {text: "Nombre", style: "tableHeader", alignment: 'center'},
                        {text: "Entrada", style: "tableHeader", alignment: 'center'},
                        {text: "Fecha", style: "tableHeader", alignment: 'center'},

                    ],
                    ...riesgoStyle.map((registro) => 
                    [
                        { text: registro.Name, style: "tableCell", alignment: 'center'},
                        { text: registro.Entrada, style: registro.Valor, alignment: 'center'},
                        { text: registro.Fecha, style: "tableCell", alignment: 'center'},
                    ]),
                ],
            },
            layout: {
                fillcolor: (rowIndex: number) => (rowIndex === 0 ? '#CCCCCC': null),
                vLineWidth: (i: number, node: any) => 0.5,
                hLineWidth: (i: number, node: any) => 0.5,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 5,
                paddingBottom: () => 5,
            },
        },

    ];
    const estilos = {
        header:{
            fontSize: 20,
            bold: true,
            margin: [0, 10, 15] as [number, number, number],
        },
        tableHeader: {
            bold: true,
            fontSize: 12,
            color: "white",
            fillColor: '#4CAF50',
            alignment: "center"
        },
        tableCell: {
            color: 'black',
            fontSize: 15,
        },
        tableCellTarde: {
            fontSize: 15,
            fillColor: '#f5b7b1',
        },
        tableCellCerca: {
            fontSize: 15,
            fillColor: '#f9e79f',
        },
    };

    const docDefinition = {
        content: contenido,
        styles: estilos,
        defaultStyle: {
            font: "Helvetica"
        },
        background: {
            image: 'public/LogoAP.png',
            width: 400,
            opacity: 0.2,
            alignment:'center',
            absolutePosition: {x: 10 , y: 300},
        }
    };

    const pdfDoc = informeRiesgo.createPdfKitDocument(docDefinition as any);

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on("data",(chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (err)=> reject(err));
        pdfDoc.end();
    });
}


function removeBeforeTime(records: Array<{Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string}>, time: string): Array<{Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string}> {
    const filtroRinicial = new Date(`1970-01-01T07:27:59Z`).getTime();
    const filtroRfinal = new Date(`1970-01-01T07:59:59Z`).getTime();

    return records.filter(record => {
        const entradaTime = new Date(`1970-01-01T${record.Entrada}Z`).getTime();
        return entradaTime >= filtroRinicial && entradaTime <= filtroRfinal;
    });
}

function stringTonumber(Entrada: string): {hora: number, minutos: number, segundos: number} {
    const [hora, minutos, segundos] = Entrada.split(':').map(Number);
    return {hora, minutos, segundos};
}