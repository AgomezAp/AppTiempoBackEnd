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
import { parseNumbers } from 'xml2js/lib/processors';
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
        const result_Data = ordenarDatos(data);
        // console.log(result_Data);
        const result_Extra = sumarExtra(result_Data);

        return [result_Data, result_Extra];
    } catch (error) {
        throw new Error('Error al procesar el archivo XML: ' + error);
    }
}

function ordenarDatos(data: any): Array<{Hid: string, Name: string, Entrada: string, Salida: string, Fecha: string , Extra: string  , Total: string}> {
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
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}

function procesarDatos(data: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }>): Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string; Total: string }> {
    const agrupados: { [key: string]: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> } = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.Hid}`;
        if (!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item);
    });
    const agrupadosLimpios = removeDuplicate(agrupados)
    const datosProcesados: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string; Total: string }> = [];
    let total: string = '0:0';
    let primero: any = [];
    let ultimo: any = [];
    let entradaOriginal: any = []
    let extra: string = ''; 
    const datosExtraProcesados: Array<{Hid: string; Name: string; Extras: string}> = [];
    for (const clave in agrupadosLimpios) {
        console.log(agrupadosLimpios[clave])
        let sumTotal: string = '0:0';
        const grupo: Array<{ Fecha: string; Hid: string; Open_Time: string; Name: string }> = agrupadosLimpios[clave];
        for (let i = 0; i < grupo.length; i = i+2) {
            primero = grupo[i];
            ultimo =  !grupo[i+1] ? sinHuella(primero) : grupo[i+1];
            if (dayjs(primero.Open_Time).isAfter(dayjs(ultimo.Open_Time))) {
                const temp = primero;
                primero = ultimo;
                ultimo = temp;
            }
            total = formatoHora(difereciaConMoment2(primero, ultimo))
            sumTotal = convertMinutesToTime(convertTimeToMinutes(sumTotal) + convertTimeToMinutes(total))
            if (grupo.length === 1) {
                entradaOriginal = primero;
            } else if (i === 0) {
                entradaOriginal = grupo[0];
            }
        }
        let opentimeEntrada = dayjs.tz(primero.Open_Time, 'YYYY-MM-D D HH:mm:ss', 'America/Bogota')
        if(opentimeEntrada.day() !== 6 && opentimeEntrada.day() !== 0){
            extra = extraConvertMinutesToTime(convertTimeToMinutes(sumTotal) - 570);
        } else {
            extra = sumTotal;
        }
        const modificadoextra = (convertTimeToMinutes(extra) >= 0 && convertTimeToMinutes(extra) <= 30) && extra[0] !== '-' ? '0:00' : extra;
        const procesado = {
            Hid: primero.Hid,
            Name: primero.Name,
            Entrada: entradaOriginal.Open_Time,
            Salida: ultimo.Open_Time, // Puede ser nulo si solo hay un registro
            Fecha: primero.Fecha,
            Extra: modificadoextra,
            Total: sumTotal
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
    const horas = tiempo.horas;
    const minutos = tiempo.minutos;
    const formatedminutos = (minutos < 0 ? (minutos * -1) : minutos).toString().padStart(2, '0');
    return `${minutos < 0 ? `-${horas}` : horas}:${formatedminutos}`
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
// FUNCION CAMBIADA POR DIFERENCIACONMOMENT2 PARA QUE NO HAYA PROBLEMAS CON LOS SABADOS Y MENOS ESPECIFICA

export function diferenciaConMoment(entrada: {Fecha: string; Hid: string; Open_Time: string; Name: string;}, salida: {Fecha: string; Hid: string; Open_Time: string; Name: string;}): {horas: number; minutos: number}{
    let entradaMoment = dayjs.tz(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').set('seconds', 0);
    let entradaMinutos = entradaMoment.minute();
    let salidaMoment = dayjs.tz(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').set('seconds', 0);
    let salidaMinutos = salidaMoment.minute();

    if (entradaMinutos <= 30 && entradaMinutos > 0 )  {
        entradaMoment = entradaMoment.set('minute', 30);
    } else if (entradaMinutos > 30 && entradaMinutos <= 59 ) {
        entradaMoment = entradaMoment.set('minute', 0).add(1, 'hour');
    }
    if (salidaMinutos <= 30 && salidaMinutos > 0 )  {
        salidaMoment = salidaMoment.set('minute', 0);
    } else if (salidaMinutos > 30 && salidaMinutos <= 59 ) {
        salidaMoment = salidaMoment.set('minute', 30);
    }

    let duracion = dayjs.duration(salidaMoment.diff(entradaMoment));
    var horas: number = 0
    var minutos: number = 0
    if (entradaMoment.day() !== 6) {
        duracion = duracion.subtract(9, 'hours');
        duracion = duracion.subtract(30, 'minutes');
        if (duracion.seconds() > 30) {
            duracion = duracion.add(1, 'minutes');
            duracion = duracion.subtract(duracion.seconds(), 'seconds');
        }
        horas = duracion.hours();
        minutos = duracion.minutes();
        if (horas == 0 && minutos >= 0) {
            minutos = 0;
        }
    } else if (entradaMoment.day() === 6) {
        duracion = duracion.subtract(4, 'hours');
        duracion = duracion.subtract(0, 'minutes');
        if (duracion.seconds() > 30) {
            duracion = duracion.add(1, 'minutes');
            duracion = duracion.subtract(duracion.seconds(), 'seconds');
        }
        horas = duracion.hours();
        minutos = duracion.minutes();
        if (horas == 0 && minutos >= 0) {
            minutos = 0;
        }
        
    }
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
    var minutos: number = duracion.minutes();
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    return { horas, minutos };
}



function sumarExtra(data: Array<{ Hid: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }>): Array<{ Sid: string; Name: string; Acumulado: string }> {
    // Filtrar y mostrar los datos específicos para Hid 2 y 9
    const datosFiltrados = data.filter(item => item.Hid === '2' || item.Hid === '9');
    console.log('Datos filtrados para Hid 2 y 9:', datosFiltrados);

    // Crear un mapa para acumular los datos
    const acumulado: { [key: string]: { totalMinutos: number; Name: string } } = {};

    data.forEach(item => {
        console.log('Procesando item:', item);

            // Convertir el tiempo extra a minutos
            let [horas, minutos] = item.Extra.split(':').map(Number);
            if (item.Extra.startsWith('-')) {
                minutos = -Math.abs(minutos);
            }
            const totalMinutos = horas * 60 + minutos;
            console.log(`totalMinutos = ${horas * 60} + ${Math.sign(horas)} + ${minutos}`);
            console.log(`Hid: ${item.Hid}, Extra: ${item.Extra}, Total minutos: ${totalMinutos}`);

            // Si el Hid no existe en el acumulador, inicializarlo
            if (!acumulado[item.Hid]) {
                acumulado[item.Hid] = {
                    totalMinutos,
                    Name: item.Name,
                };
            } else {
                // Sumar los minutos al acumulador existente
                acumulado[item.Hid].totalMinutos += totalMinutos;
            }

            // Mostrar el estado actual del acumulador
            console.log('Estado actual del acumulador:', acumulado);
        // Solo procesar y mostrar datos cuando el Hid sea 2 o 9
        
    });

    // Convertir el acumulador en un array de resultados
    const resultado = Object.entries(acumulado).map(([Hid, { totalMinutos, Name }]) => {
        const horas = Math.floor(Math.abs(totalMinutos) / 60) * Math.sign(totalMinutos);
        const minutos = Math.abs(totalMinutos % 60);

        const acumuladoFinal = {
            Sid: Hid,
            Name,
            Acumulado: `${horas}:${minutos.toString().padStart(2, '0')}`,
        };

        // Mostrar el resultado final para cada Hid

        return acumuladoFinal;
    });

    return resultado;
}

export function convertTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + (Math.sign(hours) * minutes);
}

export function convertMinutesToTime(minutes: number): string {
    let horas = 0;
    if(minutes < 0){
        let horas = Math.floor(Math.abs(minutes)/60);
        horas = -horas
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