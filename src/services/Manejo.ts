import { parseStringPromise } from 'xml2js';
import * as procesadoModel from '../models/time';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { text } from 'express';
import PdfPrinter from 'pdfmake';
import { register } from '../controllers/user';
import { resolveContent } from 'nodemailer/lib/shared';
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
            if (cells.length === 5) {
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
                console.warn(`Fila ${i} no tiene 5 celdas:`, cells);
            }
        }
        const result_Data = ordenarDatos(data);
        const result_Extra = sumarExtra(result_Data);

        return [result_Data, result_Extra];
    } catch (error) {
        throw new Error('Error al procesar el archivo XML: ' + error);
    }
}

function ordenarDatos(data: any): Array<{Hid: string, Name: string, Entrada: string, Salida: string, Fecha: string , Extra: string  }> {
    const dataf = filtrarProcesar(data);
    const datosp = procesarDatos(dataf);
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
        item.Open_Time = openTime.format('YYYY-MM-DD HH:mm:ss');
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}

function procesarDatos(data: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }>): Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }> {
    const agrupados: { [key: string]: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> } = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.Hid}`;
        if (!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item);
    });
    const datosProcesados: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }> = [];
    const datosExtraProcesados: Array<{Hid: string; Name: string; Extras: string}> = [];
    for (const clave in agrupados) {
        const grupo: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> = agrupados[clave];
        let primero = grupo[0];
        let ultimo = grupo.length > 1 ? grupo[grupo.length - 1] : sinHuella(primero);

        // primero.Open_Time = dayjs(primero.Open_Time).subtract(15, 'hours').format('YYYY-MM-DD HH:mm:ss');
        // ultimo.Open_Time = dayjs(ultimo.Open_Time).subtract(15, 'hours').format('YYYY-MM-DD HH:mm:ss');

        let opentimeEntrada = dayjs.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        let opentimeSalida = dayjs.tz(ultimo.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        var ext = diferenciaConMoment(primero, ultimo);
        const extH = formatoHora(ext);
        // Unir los registros en uno solo
        const procesado = {
            Hid: primero.Hid,
            Name: primero.Name,
            Entrada: opentimeEntrada,
            Salida: opentimeSalida, // Puede ser nulo si solo hay un registro
            Fecha: primero.Fecha,
            Extra: extH
        };
        datosProcesados.push(procesado);
    }
    return datosProcesados;
}

export function formatoHora(tiempo: { horas: number, minutos: number }): string {
    const horas = tiempo.horas;
    const minutos = Math.abs(tiempo.minutos);
    return `${horas}:${minutos < 10 ? '0' : ''}${minutos}`;
}

function sinHuella(primero: {Fecha: string; Hid: string; Open_Time: string; Name: string;}): {Fecha: string; Hid: string; Open_Time: string; Name: string;}{
    const ultimo: {Open_Time: string} = { ...primero };
    const adjustedTime = dayjs.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').hour(17).minute(0).second(0).millisecond(0);
    ultimo.Open_Time = adjustedTime.format('YYYY-MM-DD HH:mm:ss');
    return {
        Hid: primero.Hid,
        Name: primero.Name,
        Fecha: primero.Fecha,
        Open_Time: ultimo.Open_Time
    };
}

export function diferenciaConMoment(entrada: {Fecha: string; Hid: string; Open_Time: string; Name: string;}, salida: {Fecha: string; Hid: string; Open_Time: string; Name: string;}): {horas: number; minutos: number}{
    const entradaMoment = dayjs.tz(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
    const salidaMoment = dayjs.tz(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
    let duracion = dayjs.duration(salidaMoment.diff(entradaMoment));
    duracion = duracion.subtract(9, 'hours');
    duracion = duracion.subtract(30, 'minutes');
    if (duracion.seconds() > 30) {
        duracion = duracion.add(1, 'minutes');
        duracion = duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas: number = duracion.hours();
    var minutos: number = duracion.minutes();
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    return { horas, minutos };
}

export function diferenciaUpdate(entrada: Dayjs, salida: Dayjs): {horas: number; minutos: number}{
    console.log('Aca estamos diferenciaUpdate');
    let duracion = dayjs.duration(salida.diff(entrada));
    console.log('Duracion:', duracion);
    duracion = duracion.subtract(9, 'hours');
    duracion = duracion.subtract(30, 'minutes');
    if (duracion.seconds() > 30) {
        duracion = duracion.add(1, 'minutes');
        duracion = duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas: number = duracion.hours();
    var minutos: number = duracion.minutes();
    console.log('Horas:', horas);
    console.log('Minutos:', minutos);
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    return { horas, minutos };
}

function sumarExtra(data: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }>): Array<{ Sid: string; Name: string; Acumulado: string }> {
    const acumulado: { [key: string]: { horas:number, minutos:number, Name: string}} = {};

    data.forEach(item => {
        const [horas, mintos] = item.Extra.split(':').map(Number);
        if(!acumulado[item.Hid]) {
            acumulado[item.Hid] = {horas: 0, minutos: 0, Name: item.Name} 
        }
        acumulado[item.Hid].horas += horas;
        acumulado[item.Hid].minutos += mintos;
        
        if(acumulado[item.Hid].minutos >= 60) {
            acumulado[item.Hid].horas += Math.floor(acumulado[item.Hid].minutos / 60);
            acumulado[item.Hid].minutos %= 60;
        } else if (acumulado[item.Hid].minutos <= -60) {
            acumulado[item.Hid].horas -= Math.ceil(Math.abs(acumulado[item.Hid].minutos / 60));
            acumulado[item.Hid].minutos = acumulado[item.Hid].minutos % 60;
        }
    });
    const resultado : Array<{Sid: string, Name: string, Acumulado: string}> = [];
    for(const id in acumulado){
        resultado.push({
            Sid: id,
            Name: acumulado[id].Name,
            Acumulado: `${acumulado[id].horas}:${acumulado[id].minutos < 10 ? '0' : ''}${acumulado[id].minutos}`
        });
    }
    return resultado;
}

export function convertTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export function convertMinutesToTime(minutes: number): string {
    const horas = Math.floor(minutes / 60);
    const minutos = minutes % 60;
    return formatoHora({ horas, minutos });
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
            image: 'public/LogoAp.png',
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
    const content = [
        {
            columns: [
                {image: 'public/LogoAP.png', width: 50},
                {text: "Informe de entradas y salidas\n", style: "header", alignment:'center'}
            ],
        },
        {
            table: {
                headerRows: 1,
                widths: ["*","*","*"],
                body: [
                    [
                        {text: "Nombre", style: "tableHeader", alignment: "center"},
                        {text: "Tipo", style: "tableHeader", alignment: "center"},
                        {text: "Descripcion", style: "tableHeader", alignment: "center"},
                    ],

                    ...novedad.map((item ) => [
                        {text: item.Name, style: "tableCell", alignment:"center"},
                        {text: item.type, style: "tableCell", alignment:"center"},
                        {text: item.description, style: "tableCell", alignment:"center"},
                    ]),
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
                paddingTop: () => 5,
                paddingBottom: () => 5,
            },
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
            fontSize: 12,
        },
    };
    const docDefinition = {
        content,
        styles,
        defaultStyle: {
            font: "Helvetica",
        },
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
    const riesgo = removeBeforeTime(horario, "7:25:59");
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
                {text: "Informe de entradas y salidas\n", style: "header", alignment:'center'}
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
            image: 'public/LogoAp.png',
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
    const filtroRinicial = new Date(`1970-01-01T07:25:59Z`).getTime();
    return records.filter(record => {
        const entradaTime = new Date(`1970-01-01T${record.Entrada}Z`).getTime();
        return entradaTime >= filtroRinicial;
    });
}

function stringTonumber(Entrada: string): {hora: number, minutos: number, segundos: number} {
    const [hora, minutos, segundos] = Entrada.split(':').map(Number);
    return {hora, minutos, segundos};
}