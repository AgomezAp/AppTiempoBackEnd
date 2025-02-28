"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const time_1 = require("../controllers/time");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // Guarda los archivos en memoria
const router = (0, express_1.Router)();
//Ruta para registrar horarios//
//router.post("/api/horario/enviarData",  registrarHorarios);
router.post("/api/horario/subirData", time_1.handleUploadAndConvert);
//Ruta para obtener horario de todo el personal
router.get("/api/horario/ObtenerHorario", time_1.getHorario);
//Ruta para obtener Extras
router.get("/api/horario/ObtenerExtra", time_1.getExtra);
//Ruta extra por id
router.get("/api/horario/ObtenerExtra/:id", time_1.getExtraById);
//Ruta para obtener horario por id y fecha
router.get("/api/horario/ObtenerHorario/:id/:fecha", time_1.getHorarioByIdFecha);
//Ruta para obtener horario por id
router.get("/api/horario/ObtenerHorario/:id", time_1.getHorarioById);
//Ruta para obtener horario por fecha
router.get("/api/horario/Obtener/:fecha", time_1.getHorarioByFecha);
//Ruta para actualizar salida 
router.put("/api/horario/ActualizarSalida", time_1.updateSalidaById);
//Ruta para actualizar entrada
router.put("/api/horario/ActualizarEntrada", time_1.updateEntradaById);
//Ruta para agregar registro
router.post("/api/horario/agregarRegistro", time_1.agregarRegistro);
//Ruta para informe personal
router.post("/api/horario/informePersonal", time_1.informePersonalById);
//Ruta para informe novedades
router.post("/api/horario/informeNovedad", time_1.informeNovedad);
//Ruta para informe de peligro
router.post("/api/horario/InformeRiesgo", time_1.informePeligro);
//Concatenar
router.post("/api/horario/concatenar", upload.array('files'), time_1.concatenar);
exports.default = router;
