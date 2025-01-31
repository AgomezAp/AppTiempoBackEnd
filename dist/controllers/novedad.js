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
exports.aceptarTODO = exports.deleteNovedad = exports.updateNovedadEstado = exports.updateNovedadHora = exports.getNovedad = exports.convertNovedad = void 0;
const time_1 = require("../models/time");
const permisos_1 = require("../models/permisos");
const dayjs_1 = __importDefault(require("dayjs"));
const novedad_1 = require("../services/novedad");
const convertNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permisos = yield permisos_1.Permiso.findAll();
        const novedad = yield time_1.Novedad.findAll();
        // console.log('permisos:', permisos);
        const novedadJS = novedad.map(nv => nv.toJSON());
        const novedades = (0, novedad_1.permisoToNovedad)(permisos, novedadJS);
        console.log('Novedades:', novedades);
        const newNovedades = yield time_1.Novedad.bulkCreate(novedades);
        res.status(200).json(newNovedades);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
});
exports.convertNovedad = convertNovedad;
const getNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listaNovedades = yield time_1.Novedad.findAll({
            order: [['id', 'ASC']]
        });
        const datosConvertidos = listaNovedades.map(registro => {
            const registroConvertido = registro.toJSON();
            return Object.assign(Object.assign({}, registroConvertido), { Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD') });
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener las novedades:', error);
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
});
exports.getNovedad = getNovedad;
const updateNovedadHora = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, horas } = req.body;
    try {
        if (!horas) {
            return res.status(400).json({ error: 'Falta el campo horas' });
        }
        const novedad = yield time_1.Novedad.findByPk(id);
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        yield time_1.Novedad.update({ horas }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
});
exports.updateNovedadHora = updateNovedadHora;
const updateNovedadEstado = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, aceptacion } = req.body;
    try {
        const novedad = yield time_1.Novedad.findByPk(id);
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        yield time_1.Novedad.update({ aceptacion }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
});
exports.updateNovedadEstado = updateNovedadEstado;
const deleteNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield time_1.Novedad.destroy({ where: {} });
        res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
    }
    catch (error) {
        console.error('Error al eliminar las novedades:', error);
        res.status(500).json({ error: 'Error al eliminar las novedades' });
    }
});
exports.deleteNovedad = deleteNovedad;
const aceptarTODO = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const novedades = yield time_1.Novedad.findAll();
        const novedadJS = novedades.map(nv => nv.toJSON());
        novedadJS.forEach(item => {
            if (item.aceptacion === null) {
                return res.status(400).json({ error: `la novedad de ${item.name} en la fecha ${item.fecha} no ha sido aceptada` });
            }
        });
        const soloTrue = novedadJS.filter(nv => nv.aceptacion === true);
        const extras = yield time_1.Sumatoria.findAll();
        const extrasJS = extras.map(ex => ex.toJSON());
    }
    catch (error) {
    }
    /*
    1. recibir todos los datos de NOVEDADES ✔️✔️
    2. Verificar que en todos los registros aceptacion sea true o false ✔️✔️
    3. Si alguno es null debe revisar de nuevo cada registro (el usuario) ✔️✔️
    4. Si todos los registros son true o false, se obtienen solamente los registros con aceptacion true
    5. se suman las horas en la tabla SUMATORIA.
    6. se pasan todos los datos en la tabla COPIANOVEDAD
    7 se deja la tabla NOVEDAD vacia
  
    */
});
exports.aceptarTODO = aceptarTODO;
