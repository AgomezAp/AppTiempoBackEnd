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
    const { id } = req.params;
    try {
        const area = yield area_1.Area.findByPk(id);
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
        }
        res.status(200).json(area);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener el área", error });
    }
});
exports.getAreaById = getAreaById;
const createArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, correoLider } = req.body;
    try {
        const newArea = yield area_1.Area.create({ name, correoLider });
        res.status(201).json(newArea);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al crear el área", error });
    }
});
exports.createArea = createArea;
const updateArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const area = yield area_1.Area.findByPk(id);
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
        }
        area.name = name;
        area.description = description;
        yield area.save();
        res.status(200).json(area);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al actualizar el área", error });
    }
});
exports.updateArea = updateArea;
const deleteArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const area = yield area_1.Area.findByPk(id);
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
        }
        yield area.destroy();
        res.status(200).json({ msg: "Área eliminada con éxito" });
    }
    catch (error) {
        res.status(500).json({ msg: "Error al eliminar el área", error });
    }
});
exports.deleteArea = deleteArea;
