"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteArea = exports.updateArea = exports.createArea = exports.getAreaById = exports.getAllAreas = void 0;
const parseId_1 = require("../utils/parseId");
const area_1 = require("../models/area");
const getAllAreas = async (req, res) => {
    try {
        const areas = await area_1.Area.findAll();
        res.status(200).json(areas);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener las áreas", error });
    }
};
exports.getAllAreas = getAllAreas;
const getAreaById = async (req, res) => {
    const { Aid } = req.params;
    try {
        const area = await area_1.Area.findOne({ where: { Aid: Aid } });
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
};
exports.getAreaById = getAreaById;
const createArea = async (req, res) => {
    const { Aname, correoLider } = req.body;
    // Verificar si el área ya existe
    const area = await area_1.Area.findOne({ where: { Aname: Aname } });
    if (area) {
        return res.status(400).json({
            msg: `Área ${Aname} ya existe`,
        });
    }
    try {
        await area_1.Area.create({
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
};
exports.createArea = createArea;
const updateArea = async (req, res) => {
    const { Aid } = req.params;
    const { Aname } = req.body;
    try {
        const area = await area_1.Area.findByPk((0, parseId_1.parseId)(Aid));
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
        }
        area.Aname = Aname;
        await area.save();
        res.status(200).json(area);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al actualizar el área", error });
    }
};
exports.updateArea = updateArea;
const deleteArea = async (req, res) => {
    const { Aid } = req.params;
    try {
        const area = await area_1.Area.findOne({ where: { Aid: Aid } });
        if (!area) {
            return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
        }
        await area.destroy({ where: { Aid: Aid } });
        res.status(200).json({ msg: "Área eliminada con éxito" });
    }
    catch (error) {
        res.status(500).json({ msg: "Error al eliminar el área", error });
    }
};
exports.deleteArea = deleteArea;
