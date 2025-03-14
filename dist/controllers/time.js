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
exports.deleteRegistroByHidAndFecha = exports.concatenar = exports.informePeligro = exports.informeNovedad = exports.informePersonalById = exports.agregarRegistro = exports.updateEntradaById = exports.updateSalidaById = exports.getHorarioByFecha = exports.getHorarioByIdFecha = exports.getHorarioById = exports.getExtraById = exports.getExtra = exports.getHorario = exports.handleUploadAndConvert = void 0;
const xpath_1 = __importDefault(require("xpath"));
const xmldom_1 = require("@xmldom/xmldom");
const Manejo_1 = require("../services/Manejo");
const novedad_1 = require("../services/novedad");
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
        const listahorario = yield time_1.Registro.findAll({
            order: [['unique_key', 'ASC']]
        });
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
        const listaextra = yield time_1.Sumatoria.findAll({
            order: [['Sid', 'ASC']]
        });
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
    const { id } = req.params;
    try {
        const listaextra = yield time_1.Sumatoria.findAll({
            where: { Sid: id },
        });
        if (!listaextra) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
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
        const fechaformateada = dayjs_1.default.tz(fecha, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss.SSS utc');
        const salidaformateada = dayjs_1.default.tz(salidacompleta, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        // Buscar el registro por ID y Fecha
        const registro = yield time_1.Registro.findOne({
            where: {
                Hid: id,
                Fecha: fechaformateada,
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
        const extra = registro.getDataValue('Extra');
        var entradaactual = (0, dayjs_1.default)(registro.getDataValue('Entrada'));
        var salidaactual = (0, dayjs_1.default)(salidaformateada);
        console.log('Entrada antes:', entradaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Salida antes:', salidaactual.format('YYYY-MM-DD HH:mm:ss'));
        salidaactual = salidaactual.minute() >= 30
            ? salidaactual.minute(30).second(0)
            : salidaactual.minute(0).second(0);
        entradaactual = entradaactual.minute() > 30
            ? entradaactual.add(1, 'hour').minute(0).second(0)
            : entradaactual.minute() > 0
                ? entradaactual.minute(30).second(0)
                : entradaactual;
        const extraactual = (0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual, 9, 30);
        const totalActual = (0, Manejo_1.formatoHora)((0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual, 0, 0));
        const extraactualformato = (0, Manejo_1.formatoHora)(extraactual);
        console.log('Extra anterior:', extra);
        console.log('Entrada actual:', entradaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Salida actual:', salidaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Extra actual:', extraactualformato);
        console.log('Total actual:', totalActual);
        yield time_1.Registro.update({
            Extra: extraactualformato,
            Total: totalActual
        }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var sum = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extraactualformato) - (0, novedad_1.convertirHora)(extra));
        const sumatoria = yield time_1.Sumatoria.findOne({
            where: {
                Sid: id
            }
        });
        yield time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(sumatoria === null || sumatoria === void 0 ? void 0 : sumatoria.getDataValue('Acumulado')) + (0, novedad_1.convertirHora)(sum)) }, {
            where: {
                Sid: id,
            }
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
        const extra = registro.getDataValue('Extra');
        var salidaactual = (0, dayjs_1.default)(registro.getDataValue('Salida'));
        var entradaactual = (0, dayjs_1.default)(entradaformateada);
        // Ajustar los minutos de entrada y salida
        salidaactual = salidaactual.minute() >= 30
            ? salidaactual.minute(30).second(0)
            : salidaactual.minute(0).second(0);
        entradaactual = entradaactual.minute() > 30
            ? entradaactual.add(1, 'hour').minute(0).second(0)
            : entradaactual.minute() > 0
                ? entradaactual.minute(30).second(0)
                : entradaactual;
        const extraactual = (0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual, 9, 30);
        const totalActual = (0, Manejo_1.formatoHora)((0, Manejo_1.diferenciaUpdate)(entradaactual, salidaactual, 0, 0));
        const extraactualformato = (0, Manejo_1.formatoHora)(extraactual);
        yield time_1.Registro.update({
            Extra: extraactualformato,
            Total: totalActual
        }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var sum = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extraactualformato) - (0, novedad_1.convertirHora)(extra));
        const sumatoria = yield time_1.Sumatoria.findOne({
            where: {
                Sid: id
            }
        });
        yield time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(sumatoria === null || sumatoria === void 0 ? void 0 : sumatoria.getDataValue('Acumulado')) + (0, novedad_1.convertirHora)(sum)) }, {
            where: {
                Sid: id
            }
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
    const total = (0, Manejo_1.difereciaConMoment2)(primero, segundo);
    const extH = (0, Manejo_1.convertMinutesToTime)((0, Manejo_1.convertTimeToMinutes)((0, Manejo_1.formatoHora)(total)) - 570);
    try {
        yield time_1.Registro.create({
            Hid: req.body.Hid,
            Name: req.body.Name,
            Entrada: req.body.Entrada,
            Salida: req.body.Salida,
            Fecha: req.body.Fecha,
            Extra: extH,
            Total: (0, Manejo_1.formatoHora)(total)
        });
        const listaExtras = yield time_1.Sumatoria.findAll({ where: { Sid: req.body.Hid } });
        if (listaExtras.length === 0) {
            yield time_1.Sumatoria.create({
                Sid: req.body.Hid,
                Name: req.body.Name,
                Acumulado: extH
            });
        }
        else {
            const acum = listaExtras.map(ls => ls.toJSON());
            const suma = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(acum[0].Acumulado) + (0, novedad_1.convertirHora)(extH));
            yield time_1.Sumatoria.update({ Extra: suma }, {
                where: {
                    Sid: req.body.Hid
                },
            });
        }
        ;
        res.status(200).json({
            message: `Registro agregado`,
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
        const novedadesHistorico = yield time_1.NovedadHistorico.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), fechaFinal]
                }
            }
        });
        const todasNovedades = [...novedades, ...novedadesHistorico];
        if (!todasNovedades || todasNovedades.length === 0) {
            res.status(404).json({ message: "No se encuentran novedades." });
            return;
        }
        const novedadesPlain = todasNovedades.map(novedad => {
            const obj = novedad.toJSON();
            return Object.assign({}, obj);
        });
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
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
});
exports.informePeligro = informePeligro;
const concatenar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length < 1) {
            res.status(400).json({ error: 'Debe subir al menos un archivo XML' });
            return;
        }
        // Configurar namespaces para XPath
        const namespaces = {
            ns: "urn:schemas-microsoft-com:office:spreadsheet",
            ss: "urn:schemas-microsoft-com:office:spreadsheet"
        };
        const select = xpath_1.default.useNamespaces(namespaces);
        // Procesar el primer archivo como base
        const baseXml = req.files[0].buffer.toString();
        const baseDoc = new xmldom_1.DOMParser().parseFromString(baseXml, 'text/xml');
        const baseTable = select('//ns:Table', baseDoc, true);
        if (!baseTable) {
            throw new Error('Estructura XML inválida: No se encontró la tabla');
        }
        // Procesar archivos adicionales
        for (let i = 1; i < req.files.length; i++) {
            const currentXml = req.files[i].buffer.toString();
            const currentDoc = new xmldom_1.DOMParser().parseFromString(currentXml, 'text/xml');
            const rows = select('//ns:Table/ns:Row', currentDoc);
            if (!rows || rows.length === 0) {
                console.warn(`Archivo ${req.files[i].originalname} no contiene filas válidas`);
                continue;
            }
            rows.forEach((row) => {
                if (row.nodeName === 'Row') { // Asegura que solo se añadan filas
                    const importedRow = baseDoc.importNode(row, true);
                    baseTable.appendChild(importedRow);
                }
                else {
                    console.warn(`Nodo ignorado: ${row.nodeName}`);
                }
            });
        }
        // Generar XML resultante
        const mergedXml = new xmldom_1.XMLSerializer().serializeToString(baseDoc);
        // Configurar headers y enviar respuesta
        res.set({
            'Content-Type': 'application/xml',
            'Content-Disposition': 'attachment; filename=merged.xml'
        });
        res.send(mergedXml);
    }
    catch (error) {
        console.error('Error en concatenar:', error instanceof Error ? error.stack : error);
        const errorResponse = Object.assign({ error: 'Error al procesar los archivos', details: error instanceof Error ? error.message : 'Error desconocido' }, (process.env.NODE_ENV === 'development' && {
            stack: error instanceof Error ? error.stack : undefined
        }));
        res.status(500).json(errorResponse);
    }
});
exports.concatenar = concatenar;
const deleteRegistroByHidAndFecha = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Hid, Fecha } = req.params;
    try {
        // Buscar el registro por Hid y Fecha
        const registro = yield time_1.Registro.findOne({
            where: {
                Hid,
                Fecha: dayjs_1.default.tz(Fecha, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss.SSS utc'),
            },
        });
        if (!registro) {
            return res.status(404).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} no encontrado` });
        }
        // Eliminar el registro
        yield registro.destroy();
        res.status(200).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} eliminado con éxito` });
    }
    catch (error) {
        console.error('Error al eliminar el registro:', error);
        res.status(500).json({
            error: 'Error al eliminar el registro',
            details: error.message,
        });
    }
});
exports.deleteRegistroByHidAndFecha = deleteRegistroByHidAndFecha;
