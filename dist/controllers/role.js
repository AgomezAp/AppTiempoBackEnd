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
exports.borrarRol = exports.actualizarRol = exports.crearRol = exports.leerRoleId = exports.leerRole = void 0;
const role_1 = require("../models/role");
/**
 * Obtiene todos los roles.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // GET /api/roles
 * leerRole(req, res);
 */
const leerRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listRole = yield role_1.Role.findAll();
        res.status(200).json(listRole);
    }
    catch (error) {
        res.status(500).json({
            msg: `Error al obtener las categorías`
        });
    }
});
exports.leerRole = leerRole;
/**
 * Obtiene un rol por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // GET /api/roles/:Rid
 * leerRoleId(req, res);
 */
const leerRoleId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Rid } = req.params;
    try {
        const role = yield role_1.Role.findOne({ where: { Rid: Rid } });
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
});
exports.leerRoleId = leerRoleId;
/**
 * Crea un nuevo rol.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // POST /api/roles
 * crearRol(req, res);
 */
const crearRol = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Rname } = req.body;
    const rol = yield role_1.Role.findOne({ where: { Rname: Rname } });
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
});
exports.crearRol = crearRol;
/**
 * Actualiza un rol por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // PUT /api/roles/:Rid
 * actualizarRol(req, res);
 */
const actualizarRol = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Rname } = req.body;
    const { Rid } = req.params;
    try {
        const role = yield role_1.Role.findOne({ where: { Rid: Rid } });
        if (!role) {
            return res.status(404).json({
                msg: `El rol ${Rname} no ha sido encontrado`
            });
        }
        yield role_1.Role.update({
            Rname: Rname
        }, { where: { Rid: Rid } });
        return res.json({
            msg: `Rol ${Rname} actualizado exitosamente`
        });
    }
    catch (error) {
        console.log("Rid: ", Rid, "Rname:", Rname);
        return res.status(500).json({
            msg: `Error al actualizar el rol`
        });
    }
});
exports.actualizarRol = actualizarRol;
/**
 * Elimina un rol por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // DELETE /api/roles/:Rid
 * borrarRol(req, res);
 */
const borrarRol = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Rid } = req.params;
    try {
        const role = yield role_1.Role.findOne({ where: { Rid: Rid } });
        if (!role) {
            console.log(role);
            return res.status(404).json({ msg: `Rol con Id ${Rid} no existe` });
        }
        yield role_1.Role.destroy({ where: { Rid: Rid } });
        return res.json({
            msg: `El rol con Id ${Rid} ha sido eliminado exitosamente`
        });
    }
    catch (error) {
        return res.status(500).json({
            msg: `Error al eliminar el rol con Id ${Rid}`
        });
    }
});
exports.borrarRol = borrarRol;
