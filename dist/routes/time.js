"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const time_1 = require("../controllers/time");
const router = (0, express_1.Router)();
//Ruta para registrar horarios
router.post("/api/horario/enviarData", time_1.registrarHorarios);
//Ruta para obtener horario de todo el personal
router.get("/api/horario/ObtenerHorario", time_1.getHorario);
//Ruta para obtener horario por id
router.get("/api/horario/ObtenerHorario/:id", time_1.getHorarioById);
//Ruta para actualizar salida 
router.patch("/api/horario/ActualizarSalida/:id", time_1.updateSalidaById);
exports.default = router;
