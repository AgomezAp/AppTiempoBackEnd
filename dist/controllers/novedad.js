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
exports.deleteNovedad = exports.getNovedad = exports.convertNovedad = void 0;
const time_1 = require("../models/time");
const permisos_1 = require("../models/permisos");
const dayjs_1 = __importDefault(require("dayjs"));
const Manejo_1 = require("../services/Manejo");
const convertNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permisos = yield permisos_1.Permiso.findAll();
        const novedad = yield time_1.Novedad.findAll();
        const novedadJS = novedad.map(nv => nv.toJSON());
        const transicion = permisos.map(permiso => permiso.toJSON());
        const idsNovedades = new Set(novedadJS.map(nv => nv.id));
        const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
        const novedades = transicionFiltrada.map(item => {
            const horas = (0, Manejo_1.convertTimeToMinutes)(item.horaSalida);
            console.log('Horas:', horas, 'tipo', typeof (horas));
            const enHoras = horas / (1000 * 60 * 60);
            console.log('enHoras:', enHoras, 'tipo', typeof (enHoras));
            return {
                id: item.id,
                Nid: item.Uid,
                Name: item.nombre,
                type: item.tipo,
                Fecha: item.fechaInicio,
                HoraEntrada: item.horaRegreso,
                HoraSalida: item.horaSalida,
                description: item.observaciones,
                horas: enHoras,
                aceptacion: false
            };
        });
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
        const listaNovedades = yield time_1.Novedad.findAll();
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
