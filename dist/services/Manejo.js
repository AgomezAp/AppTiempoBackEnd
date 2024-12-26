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
const backendUrl = 'http://localhost:3000/api/data/guardar-datos';
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
dayjs_1.default.extend(duration_1.default);
function processXML() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(event.target.result, 'application/xml');
                    const rows = xml.getElementsByTagName('Row');
                    const data = [];
                    for (let i = 1; i < rows.length; i++) { // Empezar desde 1 para saltar el primer elemento
                        const cells = rows[i].getElementsByTagName('Cell');
                        if (cells.length === 5) {
                            const id = cells[1].textContent.trim();
                            if (id !== '' && !id.includes('User')) { // Omitir elementos vacíos en el campo ID
                                const entry = {
                                    "SN": cells[0].textContent,
                                    "ID": id,
                                    "Name": cells[2].textContent,
                                    "Open_Time": cells[3].textContent,
                                    "Verify": cells[4].textContent
                                };
                                data.push(entry);
                            }
                        }
                    }
                    let jsonString = '{\n    "records": [\n';
                    data.forEach((entry, index) => {
                        jsonString += `        ${JSON.stringify(entry)}`;
                        if (index < data.length - 1) {
                            jsonString += ',\n';
                        }
                        else {
                            jsonString += '\n';
                        }
                    });
                    jsonString += '     ]\n}';
                    const jsonObject = JSON.parse(jsonString);
                    const result = ordenarDatos(jsonObject.records);
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
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
        ID: row.ID,
        Name: row.Name,
        Open_Time: row.Open_Time,
        Fecha: row.Fecha
    }));
}
function organizarTiempoMoment(data) {
    data.forEach(item => {
        const openTime = (0, dayjs_1.default)(item.Open_Time, 'YYYY-MM-DD HH:mm:ss');
        item.Open_Time = openTime.format('YYYY-MM-DD HH:mm:ss');
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}
function procesarDatos(data) {
    const agrupados = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.ID}`;
        if (!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item);
    });
    const datosProcesados = [];
    for (const clave in agrupados) {
        const grupo = agrupados[clave];
        const primero = grupo[0];
        const ultimo = grupo.length > 1 ? grupo[grupo.length - 1] : sinHuella(primero);
        const openTimeEntrada = new Date(primero.Open_Time).toISOString().slice(0, 19).replace('T', ' ');
        const openTimeSalida = new Date(ultimo.Open_Time).toISOString().slice(0, 19).replace('T', ' ');
        let ext = diferenciaConMoment(primero, ultimo);
        const extH = formatoHora(ext);
        // Unir los registros en uno solo
        const procesado = {
            ID: primero.ID,
            Name: primero.Name,
            Entrada: openTimeEntrada,
            Salida: openTimeSalida,
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
    const adjustedTime = (0, dayjs_1.default)(primero.Open_Time).hour(17).minute(0).second(0).millisecond(0);
    ultimo.Open_Time = adjustedTime.format('YYYY-MM-DD HH:mm:ss');
    return {
        ID: primero.ID,
        Name: primero.Name,
        Fecha: primero.Fecha,
        Open_Time: ultimo.Open_Time
    };
}
function diferenciaConMoment(entrada, salida) {
    const entradaMoment = (0, dayjs_1.default)(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss');
    const salidaMoment = (0, dayjs_1.default)(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss');
    const duracion = dayjs_1.default.duration(salidaMoment.diff(entradaMoment));
    duracion.subtract(9, 'hours');
    duracion.subtract(30, 'minutes');
    if (duracion.seconds() > 30) {
        duracion.add(1, 'minutes');
        duracion.subtract(duracion.seconds(), 'seconds');
    }
    const horas = duracion.hours();
    var minutos = duracion.minutes();
    if (horas == 0 && minutos >= 0) {
        minutos = 0;
    }
    //const segundos = duracion.seconds();
    return { horas, minutos };
}
function enviaraBD(data) {
    fetch(backendUrl, {
        method: 'POST',
        headers: {
            'content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
        if (!response.ok) {
            throw new Error('Error al enviar los datos');
        }
        return response.json(); // Parseamos la respuesta como JSON
    })
        .then(result => {
        console.log('Datos enviados correctamente:', result);
    })
        .catch(error => {
        console.error('Error al enviar los datos:', error);
    });
}
// FALTA ORGANIZAR LOS GET Y POST DE BD
