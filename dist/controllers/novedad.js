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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertNovedad = void 0;
const time_1 = require("../models/time");
const permisos_1 = require("../models/permisos");
const convertNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permisos = yield permisos_1.Permiso.findAll();
        const transicion = permisos.map(permiso => permiso.toJSON());
        const novedades = transicion.map(item => ({
            Nid: item.Nid,
            Name: item.Name,
            type: item.tipo,
            Fecha: item.Fecha,
            HoraEntrada: item.HoraEntrada,
            HoraSalida: item.HoraSalida,
            description: item.observaciones,
            horas: 0,
            aceptacion: false
        }));
        const newNovedades = yield time_1.Novedad.bulkCreate(novedades);
        res.status(200).json(newNovedades);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
});
exports.convertNovedad = convertNovedad;
