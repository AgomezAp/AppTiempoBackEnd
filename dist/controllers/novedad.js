"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aceptarTodo = exports.errorNovedad = exports.deleteNovedad = exports.updateNovedadEstado = exports.updateNovedadHora = exports.getNovedadHistorico = exports.getNovedad = exports.convertNovedad = void 0;
const parseId_1 = require("../utils/parseId");
const time_1 = require("../models/time");
const permisos_1 = require("../models/permisos");
const dayjs_1 = __importDefault(require("dayjs"));
const novedad_1 = require("../services/novedad");
const connection_1 = __importDefault(require("../database/connection"));
const sequelize_1 = require("sequelize");
const convertNovedad = async (req, res) => {
    try {
        const permisos = await permisos_1.Permiso.findAll({ where: { novedad: false } });
        // console.log(permisos.map(pr => pr.toJSON()))
        const novedadBD = await time_1.Novedad.findAll();
        // console.log(novedadBD)
        const novedadJS = novedadBD.map(nv => nv.toJSON());
        // console.log(novedadJS)
        const novedades = (0, novedad_1.permisoToNovedad)(permisos, novedadJS);
        // console.log(novedades)
        const newNovedades = await time_1.Novedad.bulkCreate(novedades, { validate: true });
        console.log(newNovedades);
        await permisos_1.Permiso.update({ novedad: true }, { where: { novedad: false } });
        res.status(200).json(newNovedades);
    }
    catch (error) {
        console.error('Error en bulkCreate:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.error('Violación de restricción UNIQUE:', error.errors);
        }
        else if (error.name === 'SequelizeValidationError') {
            console.error('Error de validación:', error.errors);
        }
        else {
            if (error instanceof Error) {
                console.error('Otro error:', error.message);
            }
            else {
                console.error('Otro error:', error);
            }
        }
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
};
exports.convertNovedad = convertNovedad;
const getNovedad = async (req, res) => {
    try {
        const listaNovedades = await time_1.Novedad.findAll({
            order: [['id', 'ASC']]
        });
        const datosConvertidos = listaNovedades.map(registro => {
            const registroConvertido = registro.toJSON();
            return {
                ...registroConvertido,
                Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
            };
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener las novedades:', error);
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
};
exports.getNovedad = getNovedad;
const getNovedadHistorico = async (req, res) => {
    try {
        const listaNovedades = await time_1.NovedadHistorico.findAll({
            order: [['Cid', 'ASC']]
        });
        const datosConvertidos = listaNovedades.map(registro => {
            const registroConvertido = registro.toJSON();
            return {
                ...registroConvertido,
                Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
            };
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener las novedades:', error);
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
};
exports.getNovedadHistorico = getNovedadHistorico;
const updateNovedadHora = async (req, res) => {
    const { id, horas } = req.body;
    try {
        if (!horas) {
            return res.status(400).json({ error: 'Falta el campo horas' });
        }
        const novedad = await time_1.Novedad.findByPk((0, parseId_1.parseId)(id));
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        await time_1.Novedad.update({ horas }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
};
exports.updateNovedadHora = updateNovedadHora;
const updateNovedadEstado = async (req, res) => {
    const { id, aceptacion } = req.body;
    try {
        const novedad = await time_1.Novedad.findByPk((0, parseId_1.parseId)(id));
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        await time_1.Novedad.update({ aceptacion }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
};
exports.updateNovedadEstado = updateNovedadEstado;
const deleteNovedad = async (req, res) => {
    const { ids } = req.body;
    try {
        if (ids && ids.length > 0) {
            await time_1.Novedad.destroy({
                where: {
                    id: {
                        [sequelize_1.Op.in]: ids
                    }
                }
            });
            res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
        }
        else {
            await time_1.Novedad.destroy({ where: {} });
            res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
        }
    }
    catch (error) {
        console.error('Error al eliminar las novedades:', error);
        res.status(500).json({ error: 'Error al eliminar las novedades' });
    }
};
exports.deleteNovedad = deleteNovedad;
const errorNovedad = async (req, res) => {
    const { Cid } = req.body;
    if (!Cid) {
        return res.status(400).json({ error: 'falta id' });
    }
    const transaction = await connection_1.default.transaction();
    try {
        const novedadHistorico = await time_1.NovedadHistorico.findByPk((0, parseId_1.parseId)(Cid), { transaction });
        if (!novedadHistorico) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Novedad no encontrada en la tabla NovedadHistorico' });
        }
        else {
            // Convertir el registro a un objeto JSON
            const novedadData = novedadHistorico.toJSON();
            const novedad = {
                id: novedadData.Cid,
                Nid: novedadData.Nid,
                Name: novedadData.Name,
                type: novedadData.type,
                Fecha: novedadData.Fecha,
                HoraEntrada: novedadData.HoraEntrada,
                HoraSalida: novedadData.HoraSalida,
                description: novedadData.description,
                horas: novedadData.horas,
                aceptacion: novedadData.aceptacion
            };
            if (novedadData.aceptacion === false) {
                // Insertar el registro en la tabla Novedad
                await time_1.Novedad.create(novedad, { transaction });
                // Eliminar el registro de la tabla NovedadHistorico
                await time_1.NovedadHistorico.destroy({ where: { Cid }, transaction });
                await transaction.commit();
                res.status(200).json({ message: 'Novedad movida de NovedadHistorico a Novedad' });
            }
            else {
                const hMinutos = (0, novedad_1.convertirHora)(novedadData.horas);
                const sum = typeof hMinutos === "number" ? -hMinutos : 0;
                const sumatoria = await time_1.Sumatoria.findOne({ where: { Sid: novedadData.Nid }, transaction });
                if (sumatoria) {
                    const actual = (0, novedad_1.convertirHora)(sumatoria.dataValues.Acumulado);
                    const minutosTotales = actual + sum;
                    await time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)(minutosTotales) }, { where: { Sid: novedadData.Nid },
                        transaction });
                }
                else {
                    //Si el registro no existe. lo crea agregandole los datos de sum
                    await time_1.Sumatoria.create({
                        Sid: novedadData.Nid,
                        Name: novedadData.Name,
                        Acumulado: (0, novedad_1.convertirMinuto)(-sum)
                    }, { transaction });
                }
                await time_1.Novedad.create(novedad, { transaction });
                await time_1.NovedadHistorico.destroy({ where: { Cid }, transaction });
                await transaction.commit();
                res.status(200).json({ message: 'Novedad movida de NovedadHistorico a Novedad' });
            }
        }
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error al mover la novedad:', error);
        const errorMessage = error.message;
        res.status(500).json({ error: 'Error al mover la novedad', message: errorMessage });
    }
};
exports.errorNovedad = errorNovedad;
const aceptarTodo = async (req, res) => {
    const transaction = await connection_1.default.transaction();
    try {
        let novedades = await time_1.Novedad.findAll({
            where: {
                aceptacion: [true, false],
            },
            transaction
        });
        let novedadJS = novedades.map(nv => nv.toJSON());
        if (novedadJS.length === 0) {
            return res.status(404).json({ message: "No hay novedades para procesar" });
        }
        //Mapea las novedades obtenidas en formato json
        const sum = novedadJS
            .filter(nv => nv.aceptacion === true)
            .map(nv => ({
            Uid: nv.Nid,
            hora: (0, novedad_1.convertirHora)(nv.horas),
            nombre: nv.Name
        }));
        const agrupado = {};
        sum.forEach(item => {
            if (agrupado[item.Uid]) {
                agrupado[item.Uid] += item.hora;
            }
            else {
                agrupado[item.Uid] = item.hora;
            }
        });
        for (const uid in agrupado) {
            //minutos acumulados en novedades
            const minutosAcumulados = agrupado[uid];
            //busca en sumatoria por id
            const sumatoria = await time_1.Sumatoria.findOne({ where: { Sid: uid }, transaction });
            //Si existe el registro
            if (sumatoria) {
                // asigna a actual la cantidad de horas (minutos) extras que tiene el usuario
                const actual = (0, novedad_1.convertirHora)(sumatoria.dataValues.Acumulado);
                // Hace la suma de tiempo extra y minutos acumulados en novedades 
                const minutosTotales = actual + minutosAcumulados;
                //busca por id y actualiza el acumulado (convirtiendo al formato)
                await time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)(minutosTotales) }, { where: { Sid: uid },
                    transaction });
            }
            else {
                const registro = sum.find((item) => item.Uid === parseInt(uid));
                const nombre = registro ? registro.nombre : `Usuario con id ${uid} no encontrado`;
                //Si el registro no existe. lo crea agregandole los datos de sum
                await time_1.Sumatoria.create({
                    Sid: uid,
                    Name: nombre,
                    Acumulado: (0, novedad_1.convertirMinuto)(minutosAcumulados)
                }, { transaction });
            }
        }
        const todasNovedades = await time_1.Novedad.findAll({ where: { aceptacion: { [sequelize_1.Op.or]: [true, false] } }, transaction });
        const todasNovedadesJS = todasNovedades.map(nv => nv.toJSON());
        const novedadHistorico = todasNovedadesJS.map(nv => ({
            Cid: nv.id,
            Nid: nv.Nid,
            Name: nv.Name,
            type: nv.type,
            Fecha: nv.Fecha,
            HoraEntrada: nv.HoraEntrada,
            HoraSalida: nv.HoraSalida,
            description: nv.description,
            horas: nv.horas,
            aceptacion: nv.aceptacion
        }));
        await time_1.NovedadHistorico.bulkCreate(novedadHistorico, { transaction });
        await time_1.Novedad.destroy({ where: { aceptacion: { [sequelize_1.Op.or]: [true, false] } }, transaction });
        await transaction.commit();
        return res.status(200).json({ message: 'Aceptado o rechazado todo este' });
    }
    catch (error) {
        await transaction.rollback();
        //En caso de error retorna mensaje de error
        console.error('Error al aceptar las novedades:', error);
        return res.status(500).json({ error: 'Error al aceptar las novedades' });
    }
};
exports.aceptarTodo = aceptarTodo;
