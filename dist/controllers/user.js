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
exports.resetPassword = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const role_1 = require("../models/role");
const user_1 = require("../models/user");
// Registro de usuario con asignación de rol
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, lastName, password, email, Rid } = req.body;
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
// Login con validación de rol
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, email } = req.body;
    // Buscar usuario por email
    const user = yield user_1.User.findOne({
        where: { email },
        include: [{ model: role_1.Role, as: 'role' }], // Incluir rol en la consulta
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
    }, process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS', {
        expiresIn: '30m',
    });
    res.json({
        msg: 'Inicio de sesión exitoso',
        token,
        role: user.role.Rname
    });
});
exports.login = login;
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
