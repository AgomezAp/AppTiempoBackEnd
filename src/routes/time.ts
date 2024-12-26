import { Router } from 'express';

import { 
    registrarHorarios,
    getHorario,
    getHorarioById,
    updateSalidaById,
 } from '../controllers/time';
import validateToken  from './validateToken';

const router = Router();

//Ruta para registrar horarios
router.post("/api/horario/enviarData",  registrarHorarios);
//Ruta para obtener horario de todo el personal
router.get("/api/horario/ObtenerHorario",  getHorario);
//Ruta para obtener horario por id
router.get("/api/horario/ObtenerHorario/:id", getHorarioById);
//Ruta para actualizar salida 
router.patch("/api/horario/ActualizarSalida/:id", updateSalidaById);

export default router