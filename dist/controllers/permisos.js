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
exports.getAllUsersWithPermisos = exports.getPermisosByUserId = exports.createPermiso = void 0;
const multer_1 = __importDefault(require("multer"));
const permisos_1 = require("../models/permisos");
const user_1 = require("../models/user");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage }).single('soporte');
const createPermiso = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
        }
        const { emailPersonal, emailLider, nombre, numeroDocumento, fecha, tipo, horaEntrada, horaSalida, observaciones } = req.body;
        const soporte = req.file ? req.file.buffer : null;
        const Uid = parseInt(req.body.Uid, 10);
        const novedad = false;
        // Verificar si todos los campos obligatorios están presentes
        if (!emailPersonal || !emailLider || !nombre || !numeroDocumento || !fecha || !tipo || !Uid) {
            return res.status(400).json({ msg: 'Todos los campos obligatorios deben estar presentes' });
        }
        // Verificar si el usuario existe
        const user = yield user_1.User.findByPk(Uid);
        if (!user) {
            return res.status(400).json({
                msg: `El usuario con ID ${Uid} no existe`,
            });
        }
        try {
            // Crear permiso asociado al usuario
            const newPermiso = yield permisos_1.Permiso.create({
                emailPersonal,
                emailLider,
                nombre,
                numeroDocumento,
                fecha,
                tipo,
                horaSalida,
                horaEntrada,
                observaciones,
                soporte,
                novedad,
                Uid,
            });
            //Envía correo electrónico al lider 
            // const subject = 'Nuevo Permiso Solicitado';
            // const text = `Se ha solicitado un nuevo permiso para ${nombre}. Tipo de permiso: ${tipo}. Fecha de salida: ${fecha}. Hora de salida: ${horaSalida}. Hora de regreso: ${horaEntrada}. Observaciones: ${observaciones}`;
            // const fixedRecipients = process.env.FIXED_RECIPIENTS?.split(',') || [];
            // await sendMail([...fixedRecipients, emailLider], subject, text);
            res.status(200).json({
                message: 'Permiso creado con éxito',
                permiso: newPermiso,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                msg: 'Error al crear el permiso triste',
                error: err,
            });
        }
    }));
});
exports.createPermiso = createPermiso;
const getPermisosByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ msg: 'El parámetro id es requerido' });
    }
    try {
        const permisos = yield permisos_1.Permiso.findAll({ where: { Uid: id } });
        res.status(200).json(permisos);
    }
    catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ msg: 'Error al obtener los permisos del usuario', error: errorMessage });
    }
});
exports.getPermisosByUserId = getPermisosByUserId;
const getAllUsersWithPermisos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.User.findAll({ include: [{ model: permisos_1.Permiso, as: 'permisos' }] });
        res.status(200).json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los usuarios con permisos', error });
    }
});
exports.getAllUsersWithPermisos = getAllUsersWithPermisos;
