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
exports.deleteUserById = exports.getAllUsers = exports.resetPassword = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const area_1 = require("../models/area");
const role_1 = require("../models/role");
const user_1 = require("../models/user");
// Registro de usuario con asignación de rol
/**
 * Registra un nuevo usuario.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/register
 * register(req, res);
 */
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, lastName, password, email, Rid, Aid } = req.body;
    // Verificar si el usuario ya existe
    const userOne = yield user_1.User.findOne({ where: { email: email } });
    if (userOne) {
        return res.status(400).json({
            msg: `El usuario ya existe con el email: ${email}`,
        });
    }
    // Verificar si el rol existe
    const role = yield role_1.Role.findByPk(Rid);
    if (!role) {
        return res.status(400).json({
            msg: `El rol con ID ${Rid} no existe`,
        });
    }
    // Hashear la contraseña
    const passwordHash = yield bcrypt_1.default.hash(password, 10);
    try {
        // Crear usuario con el rol asignado
        const newUser = yield user_1.User.create({
            name,
            lastName,
            password: passwordHash,
            email,
            status: 1,
            Rid: Rid, // Asociar rol al usuario
            Aid: Aid
        });
        res.status(200).json({
            message: 'Usuario registrado con éxito',
            user: newUser,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Problemas al registrar el usuario',
            message: err.message || err,
        });
    }
});
exports.register = register;
/**
 * Inicia sesión con validación de rol.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/login
 * login(req, res);
 */
// Login con validación de rol
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, email } = req.body;
    // Buscar usuario por email
    const user = yield user_1.User.findOne({
        where: { email },
        include: [{ model: role_1.Role, as: 'role' }, { model: area_1.Area, as: 'area' }], // Incluir rol en la consulta
    });
    if (!user) {
        return res.status(400).json({
            msg: `Usuario no existe con el correo ${email}`,
        });
    }
    // Verificar contraseña
    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({
            msg: 'Contraseña incorrecta',
        });
    }
    // Crear token con datos del usuario y su rol
    const token = jsonwebtoken_1.default.sign({
        userId: user.Uid,
        email: user.email,
        role: user.role.Rname, // Agregar nombre del rol al token
        area: user.area.Aname,
        Aid: user.Aid
    }, process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS', {
        expiresIn: '30m',
    });
    res.json({
        msg: 'Inicio de sesión exitoso',
        token,
        role: user.role.Rname,
        userId: user.Uid,
        area: user.area.Aname,
        Aid: user.Aid,
        correoLider: user.area.correoLider
    });
});
exports.login = login;
/**
 * Restablece la contraseña de un usuario.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/reset-password
 * resetPassword(req, res);
 */
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, newPassword } = req.body;
    try {
        const user = yield user_1.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        const passwordHash = yield bcrypt_1.default.hash(newPassword, 10);
        user.password = passwordHash;
        yield user.save();
        res.status(200).json({ msg: 'Contraseña actualizada con éxito' });
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al actualizar la contraseña', error });
    }
});
exports.resetPassword = resetPassword;
/**
 * Obtiene todos los usuarios.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // GET /api/users
 * getAllUsers(req, res);
 */
// Obtener todos los usuarios
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.User.findAll({
            include: [{ model: role_1.Role, as: 'role' }, { model: area_1.Area, as: 'area' }], // Incluir rol en la consulta
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al obtener los usuarios', error });
    }
});
exports.getAllUsers = getAllUsers;
/**
 * Elimina un usuario por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 *
 * @example
 * // Ejemplo de uso:
 * // DELETE /api/users/:Uid
 * deleteUserById(req, res);
 */
// Borrar usuario por ID
const deleteUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Uid } = req.params;
    try {
        const user = yield user_1.User.findByPk(Uid);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        yield user.destroy();
        res.status(200).json({ msg: 'Usuario eliminado con éxito' });
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al eliminar el usuario', error });
    }
});
exports.deleteUserById = deleteUserById;
