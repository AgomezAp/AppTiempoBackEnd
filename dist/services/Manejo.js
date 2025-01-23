"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processXML = processXML;
exports.formatoHora = formatoHora;
exports.diferenciaConMoment = diferenciaConMoment;
exports.diferenciaUpdate = diferenciaUpdate;
exports.convertTimeToMinutes = convertTimeToMinutes;
exports.convertMinutesToTime = convertMinutesToTime;
exports.informePersonal = informePersonal;
exports.informeNovedades = informeNovedades;
exports.informeRiesgo = informeRiesgo;
const xml2js_1 = require("xml2js");
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const pdfmake_1 = __importDefault(require("pdfmake"));
dayjs_1.default.extend(duration_1.default);
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.tz.setDefault('America/Bogota');
function processXML(xmlContent) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        try {
            const result = yield (0, xml2js_1.parseStringPromise)(xmlContent);
            const rows = result.Workbook.Worksheet[0].Table[0].Row;
            const data = [];
            for (let i = 3; i < rows.length; i++) { // Empezar desde 3 para saltar los primeros elementos
                const cells = rows[i].Cell;
                if (cells.length === 5) {
                    const id = (_d = (_c = (_b = (_a = cells[1]) === null || _a === void 0 ? void 0 : _a.Data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c._) === null || _d === void 0 ? void 0 : _d.trim();
                    if (id && id !== '' && !id.includes('User')) { // Omitir elementos vacíos en el campo ID
                        const entry = {
                            "SN": ((_g = (_f = (_e = cells[0]) === null || _e === void 0 ? void 0 : _e.Data) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g._) || '',
                            "Hid": id,
                            "Name": ((_k = (_j = (_h = cells[2]) === null || _h === void 0 ? void 0 : _h.Data) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k._) || '',
                            "Open_Time": ((_o = (_m = (_l = cells[3]) === null || _l === void 0 ? void 0 : _l.Data) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o._) || '',
                            "Verify": ((_r = (_q = (_p = cells[4]) === null || _p === void 0 ? void 0 : _p.Data) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r._) || ''
                        };
                        data.push(entry);
                    }
                }
                else {
                    console.warn(`Fila ${i} no tiene 5 celdas:`, cells);
                }
            }
            const result_Data = ordenarDatos(data);
            const result_Extra = sumarExtra(result_Data);
            return [result_Data, result_Extra];
        }
        catch (error) {
            throw new Error('Error al procesar el archivo XML: ' + error);
        }
    });
}
function ordenarDatos(data) {
    const dataf = filtrarProcesar(data);
    const datosp = procesarDatos(dataf);
    return datosp;
}
function filtrarProcesar(data) {
    organizarTiempoMoment(data);
    return data.map(row => ({
        Hid: row.Hid,
        Name: row.Name,
        Open_Time: row.Open_Time,
        Fecha: row.Fecha
    }));
}
function organizarTiempoMoment(data) {
    data.forEach(item => {
        const openTime = dayjs_1.default.tz(item.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
        item.Open_Time = openTime.format('YYYY-MM-DD HH:mm:ss');
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}
function procesarDatos(data) {
    const agrupados = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.Hid}`;
        if (!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item);
    });
    const datosProcesados = [];
    const datosExtraProcesados = [];
    for (const clave in agrupados) {
        const grupo = agrupados[clave];
        let primero = grupo[0];
        let ultimo = grupo.length > 1 ? grupo[grupo.length - 1] : sinHuella(primero);
        // primero.Open_Time = dayjs(primero.Open_Time).subtract(15, 'hours').format('YYYY-MM-DD HH:mm:ss');
        // ultimo.Open_Time = dayjs(ultimo.Open_Time).subtract(15, 'hours').format('YYYY-MM-DD HH:mm:ss');
        let opentimeEntrada = dayjs_1.default.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        let opentimeSalida = dayjs_1.default.tz(ultimo.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
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
function formatoHora(tiempo) {
    const horas = tiempo.horas;
    const minutos = Math.abs(tiempo.minutos);
    return `${horas}:${minutos < 10 ? '0' : ''}${minutos}`;
}
function sinHuella(primero) {
    const ultimo = Object.assign({}, primero);
    const adjustedTime = dayjs_1.default.tz(primero.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota').hour(17).minute(0).second(0).millisecond(0);
    ultimo.Open_Time = adjustedTime.format('YYYY-MM-DD HH:mm:ss');
    return {
        Hid: primero.Hid,
        Name: primero.Name,
        Fecha: primero.Fecha,
        Open_Time: ultimo.Open_Time
    };
}
function diferenciaConMoment(entrada, salida) {
    const entradaMoment = dayjs_1.default.tz(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
    const salidaMoment = dayjs_1.default.tz(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss', 'America/Bogota');
    let duracion = dayjs_1.default.duration(salidaMoment.diff(entradaMoment));
    duracion = duracion.subtract(9, 'hours');
    duracion = duracion.subtract(30, 'minutes');
    if (duracion.seconds() > 30) {
        duracion = duracion.add(1, 'minutes');
        duracion = duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas = duracion.hours();
    var minutos = duracion.minutes();
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    return { horas, minutos };
}
function diferenciaUpdate(entrada, salida) {
    console.log('Aca estamos diferenciaUpdate');
    let duracion = dayjs_1.default.duration(salida.diff(entrada));
    console.log('Duracion:', duracion);
    duracion = duracion.subtract(9, 'hours');
    duracion = duracion.subtract(30, 'minutes');
    if (duracion.seconds() > 30) {
        duracion = duracion.add(1, 'minutes');
        duracion = duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas = duracion.hours();
    var minutos = duracion.minutes();
    console.log('Horas:', horas);
    console.log('Minutos:', minutos);
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    return { horas, minutos };
}
function sumarExtra(data) {
    const acumulado = {};
    data.forEach(item => {
        const [horas, mintos] = item.Extra.split(':').map(Number);
        if (!acumulado[item.Hid]) {
            acumulado[item.Hid] = { horas: 0, minutos: 0, Name: item.Name };
        }
        acumulado[item.Hid].horas += horas;
        acumulado[item.Hid].minutos += mintos;
        if (acumulado[item.Hid].minutos >= 60) {
            acumulado[item.Hid].horas += Math.floor(acumulado[item.Hid].minutos / 60);
            acumulado[item.Hid].minutos %= 60;
        }
        else if (acumulado[item.Hid].minutos <= -60) {
            acumulado[item.Hid].horas -= Math.ceil(Math.abs(acumulado[item.Hid].minutos / 60));
            acumulado[item.Hid].minutos = acumulado[item.Hid].minutos % 60;
        }
    });
    const resultado = [];
    for (const id in acumulado) {
        resultado.push({
            Sid: id,
            Name: acumulado[id].Name,
            Acumulado: `${acumulado[id].horas}:${acumulado[id].minutos < 10 ? '0' : ''}${acumulado[id].minutos}`
        });
    }
    return resultado;
}
function convertTimeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
function convertMinutesToTime(minutes) {
    const horas = Math.floor(minutes / 60);
    const minutos = minutes % 60;
    return formatoHora({ horas, minutos });
}
function informePersonal(horario) {
    return __awaiter(this, void 0, void 0, function* () {
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        const informePersonal = new pdfmake_1.default(fonts);
        const contenido = [
            {
                columns: [
                    { image: 'public/LogoAP.png', width: 50 },
                    { text: "Informe de entradas y salidas\n", style: "header", alignment: 'center' }
                ]
            },
            {
                table: {
                    headerRows: 1,
                    widths: [150, '*', '*', 100,],
                    heigths: [200],
                    body: [
                        [
                            { text: "Nombre", style: "tableHeader", alignment: 'center' },
                            { text: "Entrada", style: "tableHeader", alignment: 'center' },
                            { text: "Salida", style: "tableHeader", alignment: 'center' },
                            { text: "Fecha", style: "tableHeader", alignment: 'center' },
                        ],
                        ...horario.map((registro) => [
                            { text: registro.Name, style: "tableCell", alignment: 'center' },
                            { text: registro.Entrada, style: "tableCell", alignment: 'center' },
                            { text: registro.Salida, style: "tableCell", alignment: 'center' },
                            { text: registro.Fecha, style: "tableCell", alignment: 'center' },
                        ]),
                    ],
                },
                layout: {
                    fillcolor: (rowIndex) => (rowIndex === 0 ? '#CCCCCC' : null),
                    vLineWidth: (i, node) => 0.5,
                    hLineWidth: (i, node) => 0.5,
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
            header: {
                fontSize: 20,
                bold: true,
                margin: [0, 10, 0, 15],
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
                alignment: 'center',
                absolutePosition: { x: 10, y: 300 },
            }
        };
        const pdfDoc = informePersonal.createPdfKitDocument(docDefinition);
        return new Promise((resolve, reject) => {
            const chunks = [];
            pdfDoc.on("data", (chunk) => chunks.push(chunk));
            pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
            pdfDoc.on("error", (err) => reject(err));
            pdfDoc.end();
        });
    });
}
function informeNovedades(novedad) {
    return __awaiter(this, void 0, void 0, function* () {
        const fonts = {
            Helvetica: {
                normal: "Helvetica",
                bold: "Helvetica-Bold",
                italics: "Helvetica-Oblique",
                bolditalics: "Helvetica-BoldOblique"
            }
        };
        const printer = new pdfmake_1.default(fonts);
        const content = [
            {
                columns: [
                    { image: 'public/LogoAP.png', width: 50 },
                    { text: "Informe de entradas y salidas\n", style: "header", alignment: 'center' }
                ],
            },
            {
                table: {
                    headerRows: 1,
                    widths: ["*", "*", "*"],
                    body: [
                        [
                            { text: "Nombre", style: "tableHeader", alignment: "center" },
                            { text: "Tipo", style: "tableHeader", alignment: "center" },
                            { text: "Descripcion", style: "tableHeader", alignment: "center" },
                        ],
                        ...novedad.map((item) => [
                            { text: item.Name, style: "tableCell", alignment: "center" },
                            { text: item.type, style: "tableCell", alignment: "center" },
                            { text: item.description, style: "tableCell", alignment: "center" },
                        ]),
                    ],
                },
                layout: {
                    fillColor: (rowIndex) => (rowIndex === 0 ? "#CCCCCC" : null),
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
                margin: [0, 10, 0, 15],
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
                absolutePosition: { x: 10, y: 300 },
            },
        };
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        return new Promise((resolve, reject) => {
            const chunks = [];
            pdfDoc.on("data", (chunk) => chunks.push(chunk));
            pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
            pdfDoc.on("error", (err) => reject(err));
            pdfDoc.end();
        });
    });
}
function informeRiesgo(horario) {
    return __awaiter(this, void 0, void 0, function* () {
        const riesgo = removeBeforeTime(horario, "7:25:59");
        const riesgoStyle = riesgo.map(ries => {
            let valor = "tableCellCerca";
            const entrada = stringTonumber(ries.Entrada);
            const tarde = stringTonumber('07:31:00');
            if (entrada.hora > 7) {
                valor = "tableCellTarde";
            }
            else if (entrada.hora == 7) {
                if (entrada.minutos >= 31) {
                    valor = "tableCellTarde";
                }
                else {
                    valor = "tableCellCerca";
                }
            }
            return Object.assign(Object.assign({}, ries), { Valor: valor });
        });
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        const informeRiesgo = new pdfmake_1.default(fonts);
        const contenido = [
            {
                columns: [
                    { image: 'public/LogoAP.png', width: 50 },
                    { text: "Informe de entradas y salidas\n", style: "header", alignment: 'center' }
                ]
            },
            {
                table: {
                    headerRows: 1,
                    widths: [150, '*', 100,],
                    heigths: [200],
                    body: [
                        [
                            { text: "Nombre", style: "tableHeader", alignment: 'center' },
                            { text: "Entrada", style: "tableHeader", alignment: 'center' },
                            { text: "Fecha", style: "tableHeader", alignment: 'center' },
                        ],
                        ...riesgoStyle.map((registro) => [
                            { text: registro.Name, style: "tableCell", alignment: 'center' },
                            { text: registro.Entrada, style: registro.Valor, alignment: 'center' },
                            { text: registro.Fecha, style: "tableCell", alignment: 'center' },
                        ]),
                    ],
                },
                layout: {
                    fillcolor: (rowIndex) => (rowIndex === 0 ? '#CCCCCC' : null),
                    vLineWidth: (i, node) => 0.5,
                    hLineWidth: (i, node) => 0.5,
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
            header: {
                fontSize: 20,
                bold: true,
                margin: [0, 10, 15],
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
                alignment: 'center',
                absolutePosition: { x: 10, y: 300 },
            }
        };
        const pdfDoc = informeRiesgo.createPdfKitDocument(docDefinition);
        return new Promise((resolve, reject) => {
            const chunks = [];
            pdfDoc.on("data", (chunk) => chunks.push(chunk));
            pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
            pdfDoc.on("error", (err) => reject(err));
            pdfDoc.end();
        });
    });
}
function removeBeforeTime(records, time) {
    const filtroRinicial = new Date(`1970-01-01T07:25:59Z`).getTime();
    return records.filter(record => {
        const entradaTime = new Date(`1970-01-01T${record.Entrada}Z`).getTime();
        return entradaTime >= filtroRinicial;
    });
}
function stringTonumber(Entrada) {
    const [hora, minutos, segundos] = Entrada.split(':').map(Number);
    return { hora, minutos, segundos };
}
