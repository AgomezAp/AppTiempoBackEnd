"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.deleteUserById = exports.updateUser = exports.getListUser = exports.getAllUsers = exports.resetPassword = exports.login = exports.register = void 0;
const parseId_1 = require("../utils/parseId");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sequelize_1 = require("sequelize");
const area_1 = require("../models/area");
const role_1 = require("../models/role");
const user_1 = require("../models/user");
const permisos_1 = require("../models/permisos");
const time_1 = require("../models/time");
// Registro de usuario con asignación de rol
const register = async (req, res) => {
    const { Uid, name, lastName, password, email, Rid, Aid, salario, empresa, documentoIdentificacion, cargo, fondoPension, fondoCesantias, fechaIngreso } = req.body;
    // Verificar si el usuario ya existe
    const userOne = await user_1.User.findOne({ where: { email: email } });
    if (userOne) {
        return res.status(400).json({
            msg: `El usuario ya existe con el email: ${email}`,
        });
    }
    // Verificar si el rol existe
    const role = await role_1.Role.findByPk((0, parseId_1.parseId)(Rid));
    if (!role) {
        return res.status(400).json({
            msg: `El rol con ID ${Rid} no existe`,
        });
    }
    // Hashear la contraseña
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    try {
        // Crear usuario con el rol asignado
        const newUser = await user_1.User.create({
            Uid,
            name,
            lastName,
            password: passwordHash,
            email,
            status: 1,
            Rid: Rid, // Asociar rol al usuario
            Aid: Aid,
            salario: salario || 0,
            empresa: empresa || 'AP',
            documentoIdentificacion: documentoIdentificacion || '',
            cargo: cargo || '',
            fondoPension: fondoPension || 'PORVENIR',
            fondoCesantias: fondoCesantias || 'PORVENIR',
            fechaIngreso: fechaIngreso || null,
        });
        res.status(200).json({
            message: "Usuario registrado con éxito",
            user: newUser,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Problemas al registrar el usuario",
            message: err.message || err,
        });
    }
};
exports.register = register;
// Login con validación de rol
const login = async (req, res) => {
    try {
        const { password, email } = req.body;
        // Validar que se envíen email y password
        if (!email || !password) {
            return res.status(400).json({
                msg: "Email y contraseña son requeridos",
            });
        }
        // Buscar usuario por email
        const user = await user_1.User.findOne({
            where: { email },
            include: [
                { model: role_1.Role, as: "role" },
                { model: area_1.Area, as: "area" },
            ], // Incluir rol en la consulta
        });
        if (!user) {
            return res.status(400).json({
                msg: `Usuario no existe con el correo ${email}`,
            });
        }
        // Verificar contraseña
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                msg: "Contraseña incorrecta",
            });
        }
        // Crear token con datos del usuario y su rol
        const token = jsonwebtoken_1.default.sign({
            userId: user.Uid,
            email: user.email,
            role: user.role.Rname, // Agregar nombre del rol al token
            area: user.area.Aname,
            Aid: user.Aid,
            name: user.name,
            lastname: user.lastName,
            correolider: user.area.correolider,
        }, process.env.SECRET_KEY || "ptrYxZyMticytOs8eqKW17niMy8RR1JS", {
            expiresIn: "30m",
        });
        res.json({
            msg: "Inicio de sesión exitoso",
            token,
            role: user.role.Rname,
            userId: user.Uid,
            area: user.area.Aname,
            Aid: user.Aid,
            name: user.name,
            lastname: user.lastName,
            documentoIdentificacion: user.documentoIdentificacion || '',
            correolider: user.area.correoLider,
        });
    }
    catch (error) {
        console.error('ERROR EN LOGIN:', error);
        return res.status(500).json({
            msg: "Error en el servidor al intentar iniciar sesión",
            error: error.message || error,
        });
    }
};
exports.login = login;
const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await user_1.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        user.password = passwordHash;
        await user.save();
        res.status(200).json({ msg: "Contraseña actualizada con éxito" });
    }
    catch (error) {
        res.status(500).json({ msg: "Error al actualizar la contraseña", error });
    }
};
exports.resetPassword = resetPassword;
// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await user_1.User.findAll({
            include: [
                { model: role_1.Role, as: "role" },
                { model: area_1.Area, as: "area" },
            ], // Incluir rol en la consulta
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener los usuarios", error });
    }
};
exports.getAllUsers = getAllUsers;
const getListUser = async (req, res) => {
    try {
        const user = await user_1.User.findAll({
            attributes: ["Uid", "name", "lastName", "email"],
        });
        const userJS = user.map((us) => ({
            Uid: us.Uid,
            nombre: `${us.name} ${us.lastName}`,
            email: us.email,
        }));
        res.status(200).json(userJS);
    }
    catch (error) {
        res.status(500).json({ msg: "Error al obtener los usuarios0", error });
    }
};
exports.getListUser = getListUser;
const updateUser = async (req, res) => {
    const { Uid } = req.params;
    const { name, lastName, email, password, Rid, Aid, salario, empresa, documentoIdentificacion, cargo, fondoPension, fondoCesantias, fechaIngreso } = req.body;
    try {
        const user = await user_1.User.findByPk((0, parseId_1.parseId)(Uid));
        if (!user) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }
        if (Rid) {
            const role = await role_1.Role.findByPk((0, parseId_1.parseId)(Rid));
            if (!role) {
                return res.status(404).json({ msg: `El role con ID ${Rid} no existe` });
            }
        }
        if (Aid) {
            const area = await area_1.Area.findByPk((0, parseId_1.parseId)(Aid));
            if (!area) {
                return res.status(404).json({ msg: `El area con ID ${Aid} no existe` });
            }
        }
        user.name = name || user.name;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.Rid = Rid || user.Rid;
        user.Aid = Aid || user.Aid;
        user.salario = salario !== undefined ? salario : user.salario;
        user.empresa = empresa || user.empresa;
        user.documentoIdentificacion = documentoIdentificacion || user.documentoIdentificacion;
        user.cargo = cargo || user.cargo;
        user.fondoPension = fondoPension || user.fondoPension;
        user.fondoCesantias = fondoCesantias || user.fondoCesantias;
        user.fechaIngreso = fechaIngreso !== undefined ? fechaIngreso : user.fechaIngreso;
        if (password) {
            const passwordHash = await bcrypt_1.default.hash(password, 10);
            user.password = passwordHash;
        }
        await user.save();
        res.status(200).json({ msg: "Usuario Actualizado", user });
    }
    catch (error) {
        console.error("Error al actualizar el usuario", error);
        res.status(500).json({ msg: "Error al actualizar el usuario", error });
    }
};
exports.updateUser = updateUser;
const deleteUserById = async (req, res) => {
    const { Uid } = req.params;
    console.log("=== INICIANDO deleteUserById ===");
    console.log("Uid recibido:", Uid);
    if (!Uid) {
        console.log("❌ ERROR: Uid no proporcionado");
        return res.status(400).json({ msg: "ID de usuario requerido" });
    }
    try {
        console.log("🔍 Buscando usuario...");
        const user = await user_1.User.findByPk((0, parseId_1.parseId)(Uid));
        if (!user) {
            console.log("❌ Usuario no encontrado");
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }
        console.log("✅ Usuario encontrado:", {
            Uid: user.Uid,
            email: user.email,
            name: user.name,
        });
        // Verificar que sequelize esté disponible
        if (!user_1.User.sequelize) {
            console.error("❌ Error: Sequelize no está configurado");
            return res.status(500).json({
                msg: "Error de configuración de base de datos"
            });
        }
        // Iniciar transacción para asegurar consistencia
        const transaction = await user_1.User.sequelize.transaction();
        try {
            console.log("🧹 Eliminando registros relacionados...");
            // 1. Eliminar participantes de asistencia
            const { ParticipanteAsistencia } = await Promise.resolve().then(() => __importStar(require('../models/asistencia')));
            const participantesDeleted = await ParticipanteAsistencia.destroy({
                where: { usuarioId: Uid },
                transaction,
            });
            console.log(`✅ Participantes asistencia eliminados: ${participantesDeleted}`);
            // 2. Eliminar registros de asistencia donde es facilitador
            const { RegistroAsistencia } = await Promise.resolve().then(() => __importStar(require('../models/asistencia')));
            const asistenciasDeleted = await RegistroAsistencia.destroy({
                where: { facilitadorId: Uid },
                transaction,
            });
            console.log(`✅ Registros asistencia eliminados: ${asistenciasDeleted}`);
            // 3. Eliminar alertas
            const { Alert } = await Promise.resolve().then(() => __importStar(require('../models/alert')));
            const alertsDeleted = await Alert.destroy({
                where: { Uid: Uid },
                transaction,
            });
            console.log(`✅ Alertas eliminadas: ${alertsDeleted}`);
            // 4. Eliminar reservaciones
            const { Reservation } = await Promise.resolve().then(() => __importStar(require('../models/reservation')));
            const reservationsDeleted = await Reservation.destroy({
                where: { Uid: Uid },
                transaction,
            });
            console.log(`✅ Reservaciones eliminadas: ${reservationsDeleted}`);
            // 5. Eliminar registros de tiempo (Hid = Uid)
            const registrosDeleted = await time_1.Registro.destroy({
                where: { Hid: Uid },
                transaction,
            });
            console.log(`✅ Registros de tiempo eliminados: ${registrosDeleted}`);
            // 6. Eliminar historico de horas extras (Sid = Uid)
            const historicoDeleted = await time_1.HistoricoHorasExtras.destroy({
                where: { Sid: Uid },
                transaction,
            });
            console.log(`✅ Historico horas extras eliminado: ${historicoDeleted}`);
            // 7. Eliminar sumatoria (Sid = Uid)
            const sumatoriaDeleted = await time_1.Sumatoria.destroy({
                where: { Sid: Uid },
                transaction,
            });
            console.log(`✅ Sumatoria eliminada: ${sumatoriaDeleted}`);
            // 7. Eliminar novedades (usando Nid)
            const novedadesDeleted = await time_1.Novedad.destroy({
                where: { Nid: Uid },
                transaction,
            });
            console.log(`✅ Novedades eliminadas: ${novedadesDeleted}`);
            // 8. Eliminar historial de novedades (usando Nid)
            const novedadHistoricoDeleted = await time_1.NovedadHistorico.destroy({
                where: { Nid: Uid },
                transaction,
            });
            console.log(`✅ Historial de novedades eliminado: ${novedadHistoricoDeleted}`);
            // 9. Eliminar permisos
            const permissionsDeleted = await permisos_1.Permiso.destroy({
                where: { Uid: Uid },
                transaction,
            });
            console.log(`✅ Permisos eliminados: ${permissionsDeleted}`);
            // 10. Eliminar accesos a actas de recarga
            const { ActaRecargaAcceso } = await Promise.resolve().then(() => __importStar(require('../models/actaRecargaAcceso')));
            const accesosDeleted = await ActaRecargaAcceso.destroy({
                where: { usuarioId: Uid },
                transaction,
            });
            console.log(`✅ Accesos actas recarga eliminados: ${accesosDeleted}`);
            // 11. Finalmente eliminar el usuario
            console.log("🗑️ Eliminando usuario...");
            await user.destroy({ transaction });
            // Confirmar transacción
            await transaction.commit();
            console.log("✅ Usuario y todos los registros relacionados eliminados exitosamente");
            res.status(200).json({
                msg: "Usuario eliminado con éxito",
                details: "Se eliminaron todos los registros relacionados",
                eliminatedRecords: {
                    novedades: novedadesDeleted,
                    novedadHistorico: novedadHistoricoDeleted,
                    permisos: permissionsDeleted,
                },
            });
        }
        catch (transactionError) {
            // Revertir transacción en caso de error
            console.error("❌ Error en transacción, revirtiendo cambios...");
            await transaction.rollback();
            throw transactionError;
        }
    }
    catch (error) {
        console.error("❌ ERROR:", error);
        console.error("Detalles del error:", error.message);
        console.error("Stack trace:", error.stack);
        // Verificar si es un error de clave foránea
        if (error.name === "SequelizeForeignKeyConstraintError") {
            console.error("🔗 Error de clave foránea detectado");
            return res.status(400).json({
                msg: "No se puede eliminar el usuario porque tiene registros relacionados",
                error: "Foreign key constraint",
            });
        }
        // Error de conexión a la base de datos
        if (error.name === "ConnectionError") {
            console.error("🔌 Error de conexión a la base de datos");
            return res.status(500).json({
                msg: "Error de conexión a la base de datos",
                error: "Database connection error",
            });
        }
        // Error de columna no existente
        if (error.name === "SequelizeDatabaseError" && error.message.includes("does not exist")) {
            console.error("🗂️ Error de columna no existente");
            return res.status(500).json({
                msg: "Error en la estructura de la base de datos",
                error: "Column does not exist",
            });
        }
        res.status(500).json({
            msg: "Error al eliminar el usuario",
            error: error.message,
        });
    }
};
exports.deleteUserById = deleteUserById;
// Buscar usuarios por nombre o cédula
const searchUsers = async (req, res) => {
    const { query } = req.query;
    try {
        if (!query || query.toString().trim() === '') {
            return res.status(400).json({
                msg: "Debe proporcionar un término de búsqueda"
            });
        }
        const searchTerm = `%${query}%`;
        const users = await user_1.User.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { name: { [sequelize_1.Op.iLike]: searchTerm } },
                    { lastName: { [sequelize_1.Op.iLike]: searchTerm } },
                    { documentoIdentificacion: { [sequelize_1.Op.iLike]: searchTerm } },
                    { email: { [sequelize_1.Op.iLike]: searchTerm } }
                ],
                status: 1 // Solo usuarios activos
            },
            include: [
                { model: area_1.Area, as: 'area' },
                { model: role_1.Role, as: 'role' }
            ],
            limit: 10,
            order: [['name', 'ASC']]
        });
        res.status(200).json(users);
    }
    catch (error) {
        console.error("Error al buscar usuarios:", error);
        res.status(500).json({
            msg: "Error al buscar usuarios",
            error: error.message
        });
    }
};
exports.searchUsers = searchUsers;
