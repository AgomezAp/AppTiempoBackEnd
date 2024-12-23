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
exports.deleteArea = exports.updateArea = exports.createArea = exports.getAreaById = exports.getAllAreas = void 0;
const area_1 = require("../models/area");
const getAllAreas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const areas = yield area_1.Area.findAll();
        res.status(200).json(areas);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener las áreas", error });
    }
});
exports.getAllAreas = getAllAreas;
const getAreaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Aid } = req.params;
    try {
        const area = yield area_1.Area.findOne({ where: { Aid: Aid } });
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
        }
        return res.json({
            msg: `Area con Id${Aid} encontrado exitosamente`,
            data: area,
        });
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener el área", error });
    }
});
exports.getAreaById = getAreaById;
const createArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Aname, correoLider } = req.body;
    // Verificar si el área ya existe
    const area = yield area_1.Area.findOne({ where: { Aname: Aname } });
    if (area) {
        return res.status(400).json({
            msg: `Área ${Aname} ya existe`,
        });
    }
    try {
        yield area_1.Area.create({
            Aname: Aname,
            correoLider: correoLider,
        });
        return res.json({
            msg: `El área ${Aname} ha sido creada con éxito`,
        });
    }
    catch (error) {
        return res.status(500).json({
            msg: `Error al crear el área ${Aname}`,
            error,
        });
    }
});
exports.createArea = createArea;
const updateArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Aid } = req.params;
    const { Aname } = req.body;
    try {
        const area = yield area_1.Area.findByPk(Aid);
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
        }
        area.Aname = Aname;
        yield area.save();
        res.status(200).json(area);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al actualizar el área", error });
    }
});
exports.updateArea = updateArea;
const deleteArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Aid } = req.params;
    try {
        const area = yield area_1.Area.findOne({ where: { Aid: Aid } });
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
        }
        yield area.destroy({ where: { Aid: Aid } });
        res.status(200).json({ msg: "Área eliminada con éxito" });
    }
    catch (error) {
        res.status(500).json({ msg: "Error al eliminar el área", error });
    }
});
exports.deleteArea = deleteArea;
