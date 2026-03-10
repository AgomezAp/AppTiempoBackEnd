"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDetalleExtras = exports.getHistoricoExtrasAll = exports.getHistoricoExtras = exports.guardarSnapshotExtras = exports.restarTiempoSabado = exports.deleteRegistroByHidAndFecha = exports.concatenar = exports.addExtra = exports.updateExtra = exports.informePeligro = exports.nuevaNovedad = exports.informeNovedad = exports.informePersonalById = exports.agregarRegistro = exports.updateEntradaById = exports.updateSalidaById = exports.getHorarioByFecha = exports.getHorarioByIdFecha = exports.getHorarioById = exports.getExtraById = exports.getExtra = exports.getHorario = exports.handleUploadAndConvert = void 0;
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
const handleUploadAndConvert = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al subir el archivo', details: err });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }
        try {
            const xmlContent = req.file.buffer.toString();
            const [jsonData, jsonDataExtra] = await (0, Manejo_1.processXML)(xmlContent);
            console.log(`Cacasdac ${JSON.stringify(jsonDataExtra, null, 2)}`);
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
            const horario = await time_1.Registro.bulkCreate(jsonData);
            // Guardar snapshot ANTES de actualizar valores
            await (0, exports.guardarSnapshotExtras)();
            const listaExtras = await time_1.Sumatoria.findAll();
            let Extra;
            if (Object.keys(listaExtras).length === 0) {
                Extra = await time_1.Sumatoria.bulkCreate(jsonDataExtra);
            }
            else {
                const idsExistentes = listaExtras.map(rec => rec.getDataValue('Sid'));
                const registrosFaltantes = jsonDataExtra.filter((extra) => !idsExistentes.includes(extra.Sid));
                if (registrosFaltantes.length > 0) {
                    await time_1.Sumatoria.bulkCreate(registrosFaltantes, {
                        ignoreDuplicates: true
                    });
                }
                const resultado = listaExtras.map(record => ({
                    Sid: record.dataValues.Sid.toString(),
                    Name: record.dataValues.Name,
                    Acumulado: record.dataValues.Acumulado
                }));
                const resultadoActualizado = resultado.map(res => {
                    const matchingExtra = jsonDataExtra.find((extra) => extra.Sid === res.Sid);
                    if (matchingExtra) {
                        let [horasRes, mintosRes] = res.Acumulado.split(':').map(Number);
                        if (res.Acumulado.startsWith("-")) {
                            mintosRes = -Math.abs(mintosRes);
                        }
                        let [horasExtra, mintosExtra] = matchingExtra.Acumulado.split(':').map(Number);
                        if (matchingExtra.Acumulado.startsWith("-")) {
                            mintosExtra = -Math.abs(mintosExtra);
                        }
                        const totalMinutos = (horasRes * 60) + (horasExtra * 60) + mintosRes + mintosExtra;
                        let totalHoras = totalMinutos < 0 ? Math.ceil(totalMinutos / 60) : Math.floor(totalMinutos / 60);
                        let mintosFinales = totalMinutos % 60;
                        // if (totalHoras < 0 || mintosFinales < 0) {
                        //     totalHoras = totalHoras < 0 ? totalHoras : -totalHoras;
                        //     mintosFinales = Math.abs(mintosFinales);
                        // }
                        res.Acumulado = (0, Manejo_1.formatoHora)({ horas: totalHoras, minutos: mintosFinales });
                        console.log(res.Acumulado, totalHoras, mintosFinales);
                        return {
                            Sid: res.Sid,
                            Name: res.Name,
                            Acumulado: res.Acumulado
                        };
                    }
                    return res;
                });
                resultadoActualizado.forEach(res => {
                    if (res.Acumulado.startsWith("--")) {
                        res.Acumulado = res.Acumulado.replace("--", "-");
                    }
                });
                for (const data of resultadoActualizado) {
                    Extra = await time_1.Sumatoria.update({ Acumulado: data.Acumulado }, { where: { Sid: data.Sid } });
                }
            }
            return res.status(200).json({ message: 'Archivo procesado exitosamente', Extra, horario });
        }
        catch (error) {
            console.error('Error al procesar el archivo:', error);
            return res.status(500).json({ 'Error al procesar el archivo': error });
        }
    });
};
exports.handleUploadAndConvert = handleUploadAndConvert;
const getHorario = async (req, res) => {
    try {
        const listahorario = await time_1.Registro.findAll({
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
            return {
                ...registroConvertido,
                Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroConvertido.Entrada)).format('HH:mm:ss'),
                Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroConvertido.Salida)).format('HH:mm:ss'),
                Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
            };
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
};
exports.getHorario = getHorario;
const getExtra = async (req, res) => {
    try {
        const listaextra = await time_1.Sumatoria.findAll({
            order: [['Sid', 'ASC']]
        });
        // const listaExtras = await Sumatoria.findAll();
        res.json(listaextra);
    }
    catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
};
exports.getExtra = getExtra;
const getExtraById = async (req, res) => {
    const { id } = req.params;
    try {
        const listaextra = await time_1.Sumatoria.findAll({
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
};
exports.getExtraById = getExtraById;
const getHorarioById = async (req, res) => {
    const { id } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    try {
        const registro = await time_1.Registro.findAll({
            where: { Hid: id },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return {
                ...registroJSON,
                Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
                Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
                Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
            };
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
};
exports.getHorarioById = getHorarioById;
const getHorarioByIdFecha = async (req, res) => {
    const { id, fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const fechaactual = dayjs_1.default.utc(typeof fecha === 'string' ? fecha : fecha[0]).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = await time_1.Registro.findOne({
            where: { Hid: id, Fecha: fechaactual },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} en la fecha ${fecha} no encontrado`,
            });
        }
        const registroJSON = registro.toJSON();
        const registrosConvertidos = {
            ...registroJSON,
            Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
            Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
            Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
        };
        res.status(200).json(registrosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener empleado por ID y Fecha:', error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id} en la fecha ${fecha}`,
            error: error.message || error,
        });
    }
};
exports.getHorarioByIdFecha = getHorarioByIdFecha;
const getHorarioByFecha = async (req, res) => {
    const { fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const fechaactual = dayjs_1.default.utc(typeof fecha === 'string' ? fecha : fecha[0]).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = await time_1.Registro.findAll({
            where: { Fecha: fechaactual },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Registros en la fecha ${fecha} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return {
                ...registroJSON,
                Entrada: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
                Salida: dayjs_1.default.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
                Fecha: dayjs_1.default.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
            };
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
};
exports.getHorarioByFecha = getHorarioByFecha;
const updateSalidaById = async (req, res) => {
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
        const registro = await time_1.Registro.findOne({
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
        await time_1.Registro.update({ Salida: salidaformateada }, {
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
        await time_1.Registro.update({
            Extra: extraactualformato,
            Total: totalActual
        }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var sum = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extraactualformato) - (0, novedad_1.convertirHora)(extra));
        const sumatoria = await time_1.Sumatoria.findOne({
            where: {
                Sid: id
            }
        });
        await time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(sumatoria === null || sumatoria === void 0 ? void 0 : sumatoria.getDataValue('Acumulado')) + (0, novedad_1.convertirHora)(sum)) }, {
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
};
exports.updateSalidaById = updateSalidaById;
const updateEntradaById = async (req, res) => {
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
        const registro = await time_1.Registro.findOne({
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
        await time_1.Registro.update({ Entrada: entradaformateada }, {
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
        await time_1.Registro.update({
            Extra: extraactualformato,
            Total: totalActual
        }, {
            where: {
                Hid: id,
                Fecha: fechaformateada,
            },
        });
        var sum = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extraactualformato) - (0, novedad_1.convertirHora)(extra));
        const sumatoria = await time_1.Sumatoria.findOne({
            where: {
                Sid: id
            }
        });
        await time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(sumatoria === null || sumatoria === void 0 ? void 0 : sumatoria.getDataValue('Acumulado')) + (0, novedad_1.convertirHora)(sum)) }, {
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
};
exports.updateEntradaById = updateEntradaById;
const agregarRegistro = async (req, res) => {
    let primero = { Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Entrada, Name: req.body.Name };
    let segundo = { Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Salida, Name: req.body.Name };
    const total = (0, Manejo_1.difereciaConMoment2)(primero, segundo);
    const extH = (0, Manejo_1.convertMinutesToTime)((0, Manejo_1.convertTimeToMinutes)((0, Manejo_1.formatoHora)(total)) - 570);
    try {
        await time_1.Registro.create({
            Hid: req.body.Hid,
            Name: req.body.Name,
            Entrada: req.body.Entrada,
            Salida: req.body.Salida,
            Fecha: req.body.Fecha,
            Extra: extH,
            Total: (0, Manejo_1.formatoHora)(total)
        });
        const listaExtras = await time_1.Sumatoria.findAll({ where: { Sid: req.body.Hid } });
        if (listaExtras.length === 0) {
            await time_1.Sumatoria.create({
                Sid: req.body.Hid,
                Name: req.body.Name,
                Acumulado: extH
            });
        }
        else {
            const acum = listaExtras.map(ls => ls.toJSON());
            const suma = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(acum[0].Acumulado) + (0, novedad_1.convertirHora)(extH));
            await time_1.Sumatoria.update({ Extra: suma }, {
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
};
exports.agregarRegistro = agregarRegistro;
const informePersonalById = async (req, res) => {
    const { id, fechaInicial, fechaFinal } = req.body;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const horario = await time_1.Registro.findAll({
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
            return {
                ...obj,
                Entrada: dayjs_1.default.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'),
                Salida: dayjs_1.default.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'),
                Fecha: dayjs_1.default.utc(obj.Fecha).format('YYYY-MM-DD'),
            };
        });
        const pdfBuffer = await (0, Manejo_1.informePersonal)(horarioPlain2);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=informe_personal.pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
};
exports.informePersonalById = informePersonalById;
const informeNovedad = async (req, res) => {
    const { fechaInicial, fechaFinal } = req.body;
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const novedades = await time_1.Novedad.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), fechaFinal]
                }
            }
        });
        const novedadesHistorico = await time_1.NovedadHistorico.findAll({
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
            return { ...obj };
        });
        const pdfBuffer = await (0, Manejo_1.informeNovedades)(novedadesPlain);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
};
exports.informeNovedad = informeNovedad;
const nuevaNovedad = async (req, res) => {
    const { fechaInicial, fechaFinal } = req.body;
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    const endofDay = (fecha) => (0, dayjs_1.default)(fecha).endOf('day').toDate();
    try {
        const extras = await time_1.Sumatoria.findAll();
        const sids = extras
            .map(extra => extra.getDataValue('Sid'))
            .sort((a, b) => Number(a) - Number(b));
        const novedades = await time_1.Novedad.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), endofDay(fechaFinal)]
                }
            }
        });
        const novedadesHistorico = await time_1.NovedadHistorico.findAll({
            where: {
                Fecha: {
                    [sequelize_1.Op.between]: [startofDay(fechaInicial), endofDay(fechaFinal)]
                }
            }
        });
        const todasNovedades = [...novedades, ...novedadesHistorico];
        const resultadoPlano = todasNovedades.map(nov => {
            const novObj = nov.toJSON();
            const extra = extras.find(e => e.getDataValue('Sid') == (novObj.Nid));
            return {
                Sid: novObj.Nid,
                Name: novObj.Name,
                Acumulado: extra ? extra.getDataValue('Acumulado') : null,
                Descripcion: novObj.description,
                Fecha: (0, dayjs_1.default)(novObj.Fecha).format('YYYY-MM-DD')
            };
        });
        const resultadoAgrupado = {};
        resultadoPlano.forEach(item => {
            if (!item.Sid)
                return;
            if (!resultadoAgrupado[item.Sid]) {
                resultadoAgrupado[item.Sid] = {
                    Sid: item.Sid,
                    Name: item.Name,
                    Acumulado: item.Acumulado,
                    Descripciones: []
                };
            }
            // Buscar si ya existe una descripción igual
            const existe = resultadoAgrupado[item.Sid].Descripciones.find(d => d.Descripcion === item.Descripcion);
            if (!existe) {
                resultadoAgrupado[item.Sid].Descripciones.push({
                    Fecha: item.Fecha,
                    Descripcion: item.Descripcion
                });
            }
            else {
                // Si ya existe, actualizar la fecha si es menor o mayor
                if (item.Fecha < existe.Fecha) {
                    existe.Fecha = item.Fecha; // Primera aparición
                }
                else if (item.Fecha > existe.Fecha) {
                    // Si la fecha es mayor, agregar como última aparición
                    resultadoAgrupado[item.Sid].Descripciones.push({
                        Fecha: item.Fecha,
                        Descripcion: item.Descripcion
                    });
                }
            }
            // Ordenar por fecha y dejar solo la primera y la última si hay duplicados
            resultadoAgrupado[item.Sid].Descripciones = Object.values(resultadoAgrupado[item.Sid].Descripciones.reduce((acc, curr) => {
                if (!acc[curr.Descripcion]) {
                    acc[curr.Descripcion] = { first: curr, last: curr };
                }
                else {
                    if (curr.Fecha < acc[curr.Descripcion].first.Fecha) {
                        acc[curr.Descripcion].first = curr;
                    }
                    if (curr.Fecha > acc[curr.Descripcion].last.Fecha) {
                        acc[curr.Descripcion].last = curr;
                    }
                }
                return acc;
            }, {})).flatMap(({ first, last }) => first.Fecha === last.Fecha ? [first] : [first, last]).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
        });
        const resultadoFinal = extras.map(extra => {
            const sid = extra.getDataValue('Sid');
            const acumuladoRaw = extra.getDataValue('Acumulado');
            const acumuladoFormateado = formatearAcumuladoDias(acumuladoRaw);
            if (resultadoAgrupado[sid]) {
                return {
                    ...resultadoAgrupado[sid],
                    Acumulado: acumuladoFormateado
                };
            }
            else {
                return {
                    Sid: sid,
                    Name: extra.getDataValue('Name'),
                    Acumulado: acumuladoFormateado,
                    Descripciones: [{
                            Fecha: "",
                            Descripcion: ""
                        }]
                };
            }
        });
        resultadoFinal.sort((a, b) => a.Name.localeCompare(b.Name));
        const pdfBuffer = await (0, Manejo_1.informeNovedadNuevo)(resultadoFinal);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe" });
    }
};
exports.nuevaNovedad = nuevaNovedad;
const informePeligro = async (req, res) => {
    const { fechaInicial, fechaFinal } = req.body;
    const convertirAHorarioLocal = (fechaUTC) => {
        if (!fechaUTC)
            return null; // Manejar fechas nulas o no definidas
        return dayjs_1.default.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha) => new Date(new Date(fecha).setHours(0, 0, 0, 0));
    try {
        const horario = await time_1.Registro.findAll({
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
            return {
                ...obj,
                Entrada: dayjs_1.default.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'),
                Salida: dayjs_1.default.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'),
                Fecha: dayjs_1.default.utc(obj.Fecha).format('YYYY-MM-DD'),
            };
        });
        const pdfBuffer = await (0, Manejo_1.informeRiesgo)(horarioPlain);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe." });
    }
};
exports.informePeligro = informePeligro;
const updateExtra = async (req, res) => {
    const { id, extra } = req.body;
    try {
        if (!id || !extra) {
            return res.status(400).json({
                message: 'ID y valor de extra son requeridos',
            });
        }
        const sumatoria = await time_1.Sumatoria.findOne({
            where: { Sid: id },
        });
        if (!sumatoria) {
            return res.status(404).json({
                message: `Registro con ID ${id} no encontrado`,
            });
        }
        const extraFormateado = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extra));
        await time_1.Sumatoria.update({ Acumulado: extraFormateado }, { where: { Sid: id } });
        // Guardar snapshot después de actualizar
        await (0, exports.guardarSnapshotExtras)();
        res.status(200).json({
            message: `Valor de extra actualizado correctamente para el ID ${id}`,
        });
    }
    catch (error) {
        console.error('Error al actualizar el valor de extra:', error);
        res.status(500).json({
            error: 'Error al actualizar el valor de extra',
            details: error.message,
        });
    }
};
exports.updateExtra = updateExtra;
const addExtra = async (req, res) => {
    const { id, extra } = req.body;
    try {
        if (!id || !extra) {
            return res.status(400).json({
                message: 'ID y valor de extra son requeridos',
            });
        }
        const sumatoria = await time_1.Sumatoria.findOne({
            where: { Sid: id },
        });
        if (!sumatoria) {
            return res.status(404).json({
                message: `Registro con ID ${id} no encontrado`,
            });
        }
        const extraFormateado = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(extra));
        const acumuladoActual = sumatoria.getDataValue('Acumulado');
        const nuevoAcumulado = (0, novedad_1.convertirMinuto)((0, novedad_1.convertirHora)(acumuladoActual) + (0, novedad_1.convertirHora)(extraFormateado));
        await time_1.Sumatoria.update({ Acumulado: nuevoAcumulado }, { where: { Sid: id } });
        res.status(200).json({
            message: `Tiempo añadido correctamente al acumulado para el ID ${id}`,
            nuevoAcumulado,
        });
    }
    catch (error) {
        console.error('Error al añadir tiempo al acumulado:', error);
        res.status(500).json({
            error: 'Error al añadir tiempo al acumulado',
            details: error.message,
        });
    }
};
exports.addExtra = addExtra;
const concatenar = async (req, res) => {
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
        const errorResponse = {
            error: 'Error al procesar los archivos',
            details: error instanceof Error ? error.message : 'Error desconocido',
            ...(process.env.NODE_ENV === 'development' && {
                stack: error instanceof Error ? error.stack : undefined
            })
        };
        res.status(500).json(errorResponse);
    }
};
exports.concatenar = concatenar;
const deleteRegistroByHidAndFecha = async (req, res) => {
    const { Hid, Fecha } = req.params;
    try {
        // Buscar el registro por Hid y Fecha
        const registro = await time_1.Registro.findOne({
            where: {
                Hid,
                Fecha: dayjs_1.default.tz(typeof Fecha === 'string' ? Fecha : Fecha[0], 'America/Bogota').format('YYYY-MM-DD HH:mm:ss.SSS utc'),
            },
        });
        if (!registro) {
            return res.status(404).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} no encontrado` });
        }
        // Eliminar el registro
        await registro.destroy();
        res.status(200).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} eliminado con éxito` });
    }
    catch (error) {
        console.error('Error al eliminar el registro:', error);
        res.status(500).json({
            error: 'Error al eliminar el registro',
            details: error.message,
        });
    }
};
exports.deleteRegistroByHidAndFecha = deleteRegistroByHidAndFecha;
const restarTiempoSabado = async () => {
    try {
        const tiempoARestar = '4:00';
        const minutosARestar = (0, Manejo_1.convertTimeToMinutes)(tiempoARestar);
        const registros = await time_1.Sumatoria.findAll();
        for (const reg of registros) {
            const acumuladoActual = reg.getDataValue('Acumulado');
            const minutosAcumulados = (0, Manejo_1.convertTimeToMinutes)(acumuladoActual);
            const sabadoMinutos = minutosAcumulados - minutosARestar;
            const sabado = sabadoMinutos < 0 ? `${Math.ceil(sabadoMinutos / 60)}:${Math.abs(sabadoMinutos % 60).toString().padStart(2, '0')}` : `${Math.floor(sabadoMinutos / 60)}:${Math.abs(sabadoMinutos % 60).toString().padStart(2, '0')}`;
            await time_1.Sumatoria.update({ Acumulado: sabado }, { where: { Sid: reg.getDataValue('Sid') } });
        }
        console.log('Tiempo restado exitosamente');
    }
    catch (error) {
        console.error('Error al restar el tiempo:', error);
        throw error;
    }
};
exports.restarTiempoSabado = restarTiempoSabado;
function formatearAcumuladoDias(acumulado) {
    // Soporta valores negativos también
    const negativo = acumulado.startsWith('-');
    const [horasStr, minutosStr] = acumulado.replace('-', '').split(':');
    const horas = parseInt(horasStr, 10) || 0;
    const minutos = parseInt(minutosStr, 10) || 0;
    let totalMin = horas * 60 + minutos;
    if (negativo)
        totalMin = -totalMin;
    const minutosPorDia = 8 * 60 + 30; // 8 horas y 30 minutos = 510 minutos
    const dias = Math.trunc(totalMin / minutosPorDia);
    let restoMin = Math.abs(totalMin % minutosPorDia);
    const horasRestantes = Math.trunc(restoMin / 60);
    const minutosRestantes = restoMin % 60;
    // Manejar el caso negativo
    const signo = totalMin < 0 ? '-' : '';
    return `${signo}${Math.abs(dias)} dias ${horasRestantes} horas ${minutosRestantes} minutos`;
}
// Guardar snapshot de todas las horas extras actuales (1 por usuario por día)
const guardarSnapshotExtras = async () => {
    try {
        const hoy = (0, dayjs_1.default)().format('YYYY-MM-DD');
        const registros = await time_1.Sumatoria.findAll();
        for (const reg of registros) {
            const sid = reg.getDataValue('Sid');
            const name = reg.getDataValue('Name');
            const acumulado = reg.getDataValue('Acumulado');
            const existente = await time_1.HistoricoHorasExtras.findOne({
                where: { Sid: sid, fecha: hoy }
            });
            if (existente) {
                await time_1.HistoricoHorasExtras.update({ Acumulado: acumulado, Name: name }, { where: { Sid: sid, fecha: hoy } });
            }
            else {
                await time_1.HistoricoHorasExtras.create({
                    Sid: sid,
                    Name: name,
                    Acumulado: acumulado,
                    fecha: hoy,
                });
            }
        }
        console.log(`Snapshot de horas extras guardado: ${hoy}`);
    }
    catch (error) {
        console.error('Error al guardar snapshot de horas extras:', error);
    }
};
exports.guardarSnapshotExtras = guardarSnapshotExtras;
// Obtener historial de horas extras de un usuario
const getHistoricoExtras = async (req, res) => {
    const { id } = req.params;
    try {
        const historico = await time_1.HistoricoHorasExtras.findAll({
            where: { Sid: id },
            order: [['fecha', 'DESC']],
            limit: 60,
        });
        res.status(200).json(historico);
    }
    catch (error) {
        console.error('Error al obtener historial de extras:', error);
        res.status(500).json({ error: 'Error al obtener historial de horas extras' });
    }
};
exports.getHistoricoExtras = getHistoricoExtras;
// Obtener historial de horas extras de TODOS los usuarios
const getHistoricoExtrasAll = async (req, res) => {
    const { fecha } = req.params;
    try {
        const historico = await time_1.HistoricoHorasExtras.findAll({
            where: { fecha },
            order: [['Sid', 'ASC']],
        });
        res.status(200).json(historico);
    }
    catch (error) {
        console.error('Error al obtener historial de extras por fecha:', error);
        res.status(500).json({ error: 'Error al obtener historial de horas extras' });
    }
};
exports.getHistoricoExtrasAll = getHistoricoExtrasAll;
// Obtener detalle diario de horas extras de un usuario (filtrado por rango de fechas)
const getDetalleExtras = async (req, res) => {
    const { id } = req.params;
    const { desde, hasta } = req.query;
    try {
        if (!desde || !hasta) {
            return res.status(400).json({ error: 'Se requieren los parámetros desde y hasta' });
        }
        const registros = await time_1.Registro.findAll({
            where: {
                Hid: id,
                Fecha: {
                    [sequelize_1.Op.gte]: new Date(desde + 'T00:00:00'),
                    [sequelize_1.Op.lte]: new Date(hasta + 'T23:59:59'),
                },
            },
            order: [['Fecha', 'DESC']],
        });
        // Filtrar solo días con horas extras positivas (> 0:00)
        const conExtras = registros.filter((reg) => {
            const extra = reg.getDataValue('Extra');
            if (!extra || extra === '0:00' || extra === '0:0' || extra === '00:00')
                return false;
            if (extra.startsWith('-'))
                return false;
            return true;
        });
        res.status(200).json(conExtras);
    }
    catch (error) {
        console.error('Error al obtener detalle de extras:', error);
        res.status(500).json({ error: 'Error al obtener detalle de horas extras' });
    }
};
exports.getDetalleExtras = getDetalleExtras;
