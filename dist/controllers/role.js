"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.borrarRol = exports.actualizarRol = exports.crearRol = exports.leerRoleId = exports.leerRole = void 0;
const role_1 = require("../models/role");
const leerRole = async (req, res) => {
    try {
        const listRole = await role_1.Role.findAll();
        res.status(200).json(listRole);
    }
    catch (error) {
        res.status(500).json({
            msg: `Error al obtener las categorías`
        });
    }
};
exports.leerRole = leerRole;
const leerRoleId = async (req, res) => {
    const { Rid } = req.params;
    try {
        const role = await role_1.Role.findOne({ where: { Rid: Rid } });
        if (!role) {
            return res.status(404).json({
                msg: `El rol con el id ${Rid} no fue encontrado`
            });
        }
        return res.json({
            msg: `Rol con Id${Rid} encontrado exitosamente`,
            data: role
        });
    }
    catch (error) {
        return res.status(500).json({
            msg: `Error al buscar el rol con el Id ${Rid}`
        });
    }
};
exports.leerRoleId = leerRoleId;
const crearRol = async (req, res) => {
    const { Rname } = req.body;
    const rol = await role_1.Role.findOne({ where: { Rname: Rname } });
    if (rol) {
        return res.status(400).json({
            msg: `Rol ${Rname},ya existe`
        });
    }
    try {
        role_1.Role.create({
            Rname: Rname,
            Rstatus: 1
        });
        return res.json({
            msg: `El rol ${Rname} ha sido creado con exito `
        });
    }
    catch (error) {
        return res.json({
            msg: `Erorr al crear el rol ${Rname}`
        });
    }
};
exports.crearRol = crearRol;
const actualizarRol = async (req, res) => {
    const { Rname } = req.body;
    const { Rid } = req.params;
    try {
        const role = await role_1.Role.findOne({ where: { Rid: Rid } });
        if (!role) {
            return res.status(404).json({
                msg: `El rol ${Rname} no ha sido encontrado`
            });
        }
        await role_1.Role.update({
            Rname: Rname
        }, { where: { Rid: Rid } });
        return res.json({
            msg: `Rol ${Rname} actualizado exitosamente`
        });
    }
    catch (error) {
        return res.status(500).json({
            msg: `Error al actualizar el rol`
        });
    }
};
exports.actualizarRol = actualizarRol;
const borrarRol = async (req, res) => {
    const { Rid } = req.params;
    try {
        const role = await role_1.Role.findOne({ where: { Rid: Rid } });
        if (!role) {
            return res.status(404).json({ msg: `Rol con Id ${Rid} no existe` });
        }
        await role_1.Role.destroy({ where: { Rid: Rid } });
        return res.json({
            msg: `El rol con Id ${Rid} ha sido eliminado exitosamente`
        });
    }
    catch (error) {
        return res.status(500).json({
            msg: `Error al eliminar el rol con Id ${Rid}`
        });
    }
};
exports.borrarRol = borrarRol;
