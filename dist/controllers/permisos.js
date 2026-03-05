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
const parseId_1 = require("../utils/parseId");
const multer_1 = __importDefault(require("multer"));
const permisos_1 = require("../models/permisos");
const user_1 = require("../models/user");
const mailer_1 = require("../utils/mailer");
const googleSheets_1 = require("../utils/googleSheets");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage }).single('soporte');
const createPermiso = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (err) {
            return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
        }
        const { emailPersonal, emailLider, nombre, numeroDocumento, fecha, fechaFin, tipo, horaEntrada, horaSalida, observaciones, diasLaborales } = req.body;
        const soporte = req.file ? req.file.buffer : null;
        const Uid = parseInt(req.body.Uid, 10);
        const novedad = false;
        // Verificar si todos los campos obligatorios están presentes
        if (!emailPersonal || !emailLider || !nombre || !numeroDocumento || !fecha || !tipo || !Uid) {
            return res.status(400).json({ msg: 'Todos los campos obligatorios deben estar presentes' });
        }
        // Validar soporte obligatorio para Vacaciones y Día de la familia
        const tiposConSoporteObligatorio = ['Vacaciones', 'Día de la familia'];
        if (tiposConSoporteObligatorio.some(t => t.toLowerCase() === tipo.trim().toLowerCase()) && !soporte) {
            return res.status(400).json({ msg: 'El soporte es obligatorio para este tipo de permiso (Vacaciones / Día de la familia)' });
        }
        // Verificar si el usuario existe
        const user = yield user_1.User.findByPk((0, parseId_1.parseId)(Uid));
        if (!user) {
            return res.status(400).json({
                msg: `El usuario con ID ${Uid} no existe`,
            });
        }
        try {
            // Determinar si es un permiso de rango (varios días)
            const esPermisoRango = fechaFin && fechaFin !== fecha;
            const fechaInicioDate = new Date(fecha + 'T12:00:00');
            const fechaFinDate = esPermisoRango ? new Date(fechaFin + 'T12:00:00') : fechaInicioDate;
            // Crear permiso asociado al usuario
            const newPermiso = yield permisos_1.Permiso.create({
                emailPersonal,
                emailLider,
                nombre,
                numeroDocumento,
                fecha: fechaInicioDate,
                tipo,
                horaSalida,
                horaEntrada,
                observaciones,
                soporte,
                novedad,
                Uid,
            });
            // Agregar permiso a Google Sheets (hoja principal - TODOS los permisos)
            const permisoSheetData = {
                fecha,
                nombre,
                numeroDocumento,
                tipo: esPermisoRango ? `${tipo} (${diasLaborales || 'varios'} días)` : tipo,
                horaEntrada,
                horaSalida,
                observaciones: esPermisoRango ? `${observaciones}\n\nFecha fin: ${fechaFin}` : observaciones,
            };
            yield (0, googleSheets_1.appendPermisoToSheet)(permisoSheetData);
            // Tipos específicos para correo filtrado
            const tiposFiltrados = [
                'Cita médica',
                'Cita odontológica',
                'Vacaciones',
                'Incapacidad médica',
                'Incapacidad laboral',
            ];
            const tipoNormalizado = tipo.trim();
            // Enviar correo electrónico al líder (solo UNA VEZ)
            const subject = 'Nuevo Permiso Solicitado';
            let text = `Se ha solicitado un nuevo permiso para ${nombre}.\n\n Tipo de permiso: ${tipo}.`;
            if (esPermisoRango) {
                text += `\n Fecha de inicio: ${fecha}.\n Fecha de fin: ${fechaFin}.`;
                if (diasLaborales) {
                    text += `\n Días laborales: ${diasLaborales}.`;
                }
            }
            else {
                text += `\n Fecha: ${fecha}.`;
            }
            if (horaSalida)
                text += `\n Hora de salida: ${horaSalida}.`;
            if (horaEntrada)
                text += `\n Hora de regreso: ${horaEntrada}.`;
            text += `\n\n Observaciones: ${observaciones}`;
            const fixedRecipients = ((_a = process.env.FIXED_RECIPIENTS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
            yield (0, mailer_1.sendMail)([...fixedRecipients, emailLider, emailPersonal], subject, text, soporte);
            // Enviar correo a destinatarios filtrados SOLO para tipos específicos
            // Se excluyen los que ya están en FIXED_RECIPIENTS para evitar correos duplicados
            const filteredRecipients = ((_b = process.env.FILTERED_RECIPIENTS) === null || _b === void 0 ? void 0 : _b.split(',').map(e => e.trim()).filter(e => e)) || [];
            const fixedSet = new Set(fixedRecipients.map(e => e.trim().toLowerCase()));
            const filteredSinDuplicados = filteredRecipients.filter(e => !fixedSet.has(e.toLowerCase()));
            if (filteredSinDuplicados.length > 0 && tiposFiltrados.some(t => t.toLowerCase() === tipoNormalizado.toLowerCase())) {
                yield (0, mailer_1.sendMail)(filteredSinDuplicados, subject, text, soporte);
            }
            res.status(200).json({
                message: 'Permiso creado con éxito',
                permiso: newPermiso,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                msg: 'Error al crear el permiso',
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
