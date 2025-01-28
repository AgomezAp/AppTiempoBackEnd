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
exports.informePeligro = exports.informeNovedad = exports.informePersonalById = exports.agregarRegistro = exports.updateEntradaById = exports.updateSalidaById = exports.getHorarioByFecha = exports.getHorarioByIdFecha = exports.getHorarioById = exports.getExtraById = exports.getExtra = exports.getHorario = exports.handleUploadAndConvert = void 0;
const Manejo_1 = require("../services/Manejo");
const time_1 = require("../models/time");
const multer_1 = __importDefault(require("multer"));
const dayjs_1 = __importDefault(require("dayjs"));
const sequelize_1 = require("sequelize");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage }).single('xml');
const handleUploadAndConvert = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(500).json({ error: 'Error al subir el archivo', details: err });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }
        try {
            const xmlContent = req.file.buffer.toString();
            const [jsonData, jsonDataExtra] = yield (0, Manejo_1.processXML)(xmlContent);
            if (!Array.isArray(jsonData) || jsonData.length === 0) {
                throw new Error('Los datos procesados no son válidos o están vacíos');
            }
            jsonData.forEach((record, index) => {
                if (!record.Hid || !record.Name || !record.Entrada || !record.Salida || !record.Fecha || !record.Extra) {
                    throw new Error(`Registro ${index} no tiene todos los campos requeridos`);
                }
            });
            jsonData.forEach(record => {
                record.Entrada = dayjs_1.default.tz(record.Entrada, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
                record.Salida = dayjs_1.default.tz(record.Salida, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
                record.Fecha = dayjs_1.default.tz(record.Fecha, 'YYYY-MM-DD', 'America/Bogota').format('YYYY-MM-DD');
            });
            const horario = yield time_1.Registro.bulkCreate(jsonData);
            const listaExtras = yield time_1.Sumatoria.findAll();
            let Extra;
            if (Object.keys(listaExtras).length === 0) {
                Extra = yield time_1.Sumatoria.bulkCreate(jsonDataExtra);
            }
            else {
                const resultado = listaExtras.map(record => ({
                    Sid: record.dataValues.Sid.toString(),
                    Name: record.dataValues.Name,
                    Acumulado: record.dataValues.Acumulado
                }));
                const resultadoActualizado = resultado.map(res => {
                    const matchingExtra = jsonDataExtra.find((extra) => extra.Sid === res.Sid);
                    if (matchingExtra) {
                        const [horasRes, mintosRes] = res.Acumulado.split(':').map(Number);
                        const [horasExtra, mintosExtra] = matchingExtra.Acumulado.split(':').map(Number);
                        const totalMinutos = mintosRes + mintosExtra;
                        const totalHoras = horasRes + horasExtra + Math.floor(totalMinutos / 60);
                        const mintosFinales = totalMinutos % 60;
                        res.Acumulado = (0, Manejo_1.formatoHora)({ horas: totalHoras, minutos: mintosFinales });
                        return {
                            Sid: res.Sid,
                            Name: res.Name,
                            Acumulado: res.Acumulado
                        };
                    }
                    return res;
                });
                for (const data of resultadoActualizado) {
                    Extra = yield time_1.Sumatoria.update({ Acumulado: data.Acumulado }, { where: { Sid: data.Sid } });
                }
            }
            return res.status(200).json({ message: 'Archivo procesado exitosamente', Extra, horario });
        }
        catch (error) {
            console.error('Error al procesar el archivo:', error);
            return res.status(500).json({ 'Error al procesar el archivo': error });
        }
    }));
});
exports.handleUploadAndConvert = handleUploadAndConvert;
const getHorario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listahorario = yield time_1.Registro.findAll();
        // const listaExtras = await Sumatoria.findAll();
        const convertirAHorarioLocal = (fechaUTC) => {
            if (!fechaUTC) {
                return null;
            }
            return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        };
        const datosConvertidos = listahorario.map(registro => {
            const registroConvertido = registro.toJSON();
            return Object.assign(Object.assign({}, registroConvertido), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroConvertido.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroConvertido.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD') });
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
});
exports.getHorario = getHorario;
const getExtra = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listaextra = yield time_1.Sumatoria.findAll();
        // const listaExtras = await Sumatoria.findAll();
        res.json(listaextra);
    }
    catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
});
exports.getExtra = getExtra;
const getExtraById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Sid } = req.params;
    try {
        const listaextra = yield time_1.Sumatoria.findAll({
            where: { Sid: Sid }
        });
        if (!listaextra) {
            return res.status(404).json({
                message: `Empleado con ID ${Sid} no encontrado`,
            });
        }
        res.status(200).json(listaextra);
    }
    catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
});
exports.getExtraById = getExtraById;
const getHorarioById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    try {
        const registro = yield time_1.Registro.findAll({
            where: { Hid: id },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return Object.assign(Object.assign({}, registroJSON), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD') });
        });
        res.status(200).json(registrosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener empleado por ID:', error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.getHorarioById = getHorarioById;
const getHorarioByIdFecha = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const fechaactual = dayjs_1.default.utc(fecha).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = yield time_1.Registro.findOne({
            where: { Hid: id, Fecha: fechaactual },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} en la fecha ${fecha} no encontrado`,
            });
        }
        const registroJSON = registro.toJSON();
        const registrosConvertidos = Object.assign(Object.assign({}, registroJSON), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD') });
        res.status(200).json(registrosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener empleado por ID y Fecha:', error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id} en la fecha ${fecha}`,
            error: error.message || error,
        });
    }
});
exports.getHorarioByIdFecha = getHorarioByIdFecha;
const getHorarioByFecha = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const fechaactual = dayjs_1.default.utc(fecha).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = yield time_1.Registro.findAll({
            where: { Fecha: fechaactual },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Registros en la fecha ${fecha} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return Object.assign(Object.assign({}, registroJSON), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD') });
        });
        res.status(200).json(registrosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener registros1 por Fecha:', error);
        res.status(500).json({
            message: `Error al obtener registros en la fecha ${fecha}`,
            error: error.message || error,
        });
    }
});
exports.getHorarioByFecha = getHorarioByFecha;
const updateSalidaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, fecha, salida } = req.body;
    try {
        if (!fecha || !salida) {
            return res.status(400).json({
                message: 'Fecha y hora de salida son requeridas',
            });
        }
        const salidacompleta = `${fecha} ${salida}`;
        const fechaformateada = (0, dayjs_1.default)(fecha).format('YYYY-MM-DD HH:mm:ss.SSS utc');
        const salidaformateada = dayjs_1.default.tz(salidacompleta, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        // Buscar el registro por ID y Fecha
        const registro = yield time_1.Registro.findOne({
            where: {
                Hid: id,
                Fecha: fechaformateada
            }
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado para la fecha ${fecha}`,
            });
        }
        // Actualizar el campo Salida
        yield time_1.Registro.update({ Salida: salidaformateada }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var entradaactual = (0, dayjs_1.default)(registro.getDataValue('Entrada'));
        var salidaactual = (0, dayjs_1.default)(salidaformateada);
        const extraactual = (0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual);
        const extraactualformato = (0, Manejo_1.formatoHora)(extraactual);
        yield time_1.Registro.update({ Extra: extraactualformato }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        res.status(200).json({
            message: `Hora de salida del empleado con ID ${id} actualizada correctamente like`,
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la hora de salida ajaj',
            details: error.message,
        });
    }
});
exports.updateSalidaById = updateSalidaById;
const updateEntradaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, fecha, entrada } = req.body;
    try {
        if (!fecha || !entrada) {
            return res.status(400).json({
                message: 'Fecha y hora de salida son requeridas',
            });
        }
        const entradacompleta = `${fecha} ${entrada}`;
        const fechaformateada = (0, dayjs_1.default)(fecha).format('YYYY-MM-DD HH:mm:ss.SSS utc');
        const entradaformateada = dayjs_1.default.tz(entradacompleta, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        // Buscar el registro por ID y Fecha
        const registro = yield time_1.Registro.findOne({
            where: {
                Hid: id,
                Fecha: fechaformateada
            }
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado para la fecha ${fecha}`,
            });
        }
        // Actualizar el campo Salida
        yield time_1.Registro.update({ Entrada: entradaformateada }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var salidaactual = (0, dayjs_1.default)(registro.getDataValue('Salida'));
        var entradaactual = (0, dayjs_1.default)(entradaformateada);
        const extraactual = (0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual);
        const extraactualformato = (0, Manejo_1.formatoHora)(extraactual);
        yield time_1.Registro.update({ Extra: extraactualformato }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        res.status(200).json({
            message: `Hora de entrada del empleado con ID ${id} actualizada correctamente`,
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la hora de salida ajaj',
            details: error.message,
        });
    }
});
exports.updateEntradaById = updateEntradaById;
const agregarRegistro = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let primero = { Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Entrada, Name: req.body.Name };
    let segundo = { Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Salida, Name: req.body.Name };
    const ext = (0, Manejo_1.diferenciaConMoment)(primero, segundo);
    const extH = (0, Manejo_1.formatoHora)(ext);
    try {
        const horario = yield time_1.Registro.create({
            Hid: req.body.Hid,
            Name: req.body.Name,
            Entrada: req.body.Entrada,
            Salida: req.body.Salida,
            Fecha: req.body.Fecha,
            Extra: extH,
        });
        res.status(200).json({
            mesagge: "Registro añadido con exito",
            horario,
        });
    }
    catch (err) {
        console.error("error ", err);
        res.status(500).json({
            error: "Problemas al agregar el registro",
            mesagge: err.mesagge | err,
        });
    }
});
exports.agregarRegistro = agregarRegistro;
const informePersonalById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, fechaInicial, fechaFinal } = req.body;
    console.log("llegamos1");
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const horario = yield time_1.Registro.findAll({
            where: {
                Hid: {
                    [sequelize_1.Op.in]: id
                },
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), fechaFinal],
                },
            },
            order: [
                ['Name', 'ASC']
            ]
        });
        console.log("llegamos2");
        if (!horario || horario.length === 0) {
            res.status(404).json({ message: "No se encuentran Registros." });
            return;
        }
        // const horarioPlain = horario.map(record => record.toJSON() as { ID: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string });
        const horarioPlain2 = horario.map(record => {
            const obj = record.toJSON();
            return Object.assign(Object.assign({}, obj), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(obj.Fecha).format('YYYY-MM-DD') });
        });
        const pdfBuffer = yield (0, Manejo_1.informePersonal)(horarioPlain2);
        console.log("llegamos3");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=informe_personal.pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
});
exports.informePersonalById = informePersonalById;
// export const AgregarNovedad = async (req:Request, res:Response): Promise<any> => {
//     try {
//         const novedad = await Novedad.create({
//             Nid: req.body.Nid,
//             Name: req.body.Name,
//             type: req.body.type,
//             description: req.body.description,
//             Fecha: req.body.Fecha,
//         });
//         res.status(200).json({
//             message: "Novedad añadida con éxito",
//             novedad, // Aquí puedes devolver el producto creado si lo deseas
//         });
//     } catch (err:any) {
//         // Si ocurrió un error, devolvemos el error y el mensaje
//         console.error("este error", err); // Esto es útil para depurar el error en consola
//         res.status(500).json({
//           error: "Problemas al agregar la novedad",
//           message: err.message || err, // Aquí se agrega el mensaje del error para mayor claridad
//         });
//       }
// };
// export const getNovedad = async (req: Request, res: Response): Promise<any> => {
//     try {
//         const listaNovedades = await Novedad.findAll();
//         const datosConvertidos = listaNovedades.map(registro => {
//             const registroConvertido = registro.toJSON();
//             return {
//                 ...registroConvertido,
//                 Fecha: dayjs.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
//             };
//         });
//         res.json(datosConvertidos);
//     } catch (error) {
//         console.error('Error al obtener las novedades:', error);
//         res.status(500).json({ error: 'Error al obtener las novedades' });        
//     }
// }
const informeNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fechaInicial, fechaFinal } = req.body;
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const novedades = yield time_1.Novedad.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), fechaFinal]
                }
            }
        });
        if (!novedades || novedades.length === 0) {
            res.status(404).json({ message: "No se encuentran novedades." });
            return;
        }
        const novedadesPlain = novedades.map(novedad => {
            const obj = novedad.toJSON();
            return Object.assign({}, obj);
        });
        console.log(novedadesPlain);
        const pdfBuffer = yield (0, Manejo_1.informeNovedades)(novedadesPlain);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
});
exports.informeNovedad = informeNovedad;
const informePeligro = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fechaInicial, fechaFinal } = req.body;
    console.log("llegamos1");
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const horario = yield time_1.Registro.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), fechaFinal],
                },
            },
            order: [
                ['Name', 'ASC']
            ]
        });
        console.log("llegamos2");
        if (!horario || horario.length === 0) {
            res.status(404).json({ message: "No se encuentran Registros." });
            return;
        }
        // const horarioPlain = horario.map(record => record.toJSON() as { ID: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string });
        const horarioPlain = horario.map(record => {
            const obj = record.toJSON();
            return Object.assign(Object.assign({}, obj), { Entrada: dayjs_1.default.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'), Salida: dayjs_1.default.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'), Fecha: dayjs_1.default.utc(obj.Fecha).format('YYYY-MM-DD') });
        });
        const pdfBuffer = yield (0, Manejo_1.informeRiesgo)(horarioPlain);
        console.log("llegamos3");
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
});
exports.informePeligro = informePeligro;
