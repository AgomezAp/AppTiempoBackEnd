import { Router } from 'express';

import { 
    //registrarHorarios,
    getHorario,
    getHorarioById,
    updateSalidaById,
    handleUploadAndConvert,
    getHorarioByIdFecha,
    getHorarioByFecha,
    getExtra,
    getExtraById,
    informePersonalById,
    // AgregarNovedad,
    // getNovedad,
    informeNovedad,
    updateEntradaById,
    agregarRegistro,
    informePeligro,
    concatenar,
    deleteRegistroByHidAndFecha,
    restarTiempoSabado
 } from '../controllers/time';
import validateToken  from './validateToken';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024} }); // Guarda los archivos en memoria


const router = Router();

//Ruta para registrar horarios//
//router.post("/api/horario/enviarData",  registrarHorarios);

router.post("/api/horario/subirData",  handleUploadAndConvert);
//Ruta para obtener horario de todo el personal
router.get("/api/horario/ObtenerHorario",  getHorario);
//Ruta para obtener Extras
router.get("/api/horario/ObtenerExtra", getExtra)
//Ruta extra por id
router.get("/api/horario/ObtenerExtra/:id", getExtraById)
//Ruta para obtener horario por id y fecha
router.get("/api/horario/ObtenerHorario/:id/:fecha", getHorarioByIdFecha);
//Ruta para obtener horario por id
router.get("/api/horario/ObtenerHorario/:id", getHorarioById);
//Ruta para obtener horario por fecha
router.get("/api/horario/Obtener/:fecha", getHorarioByFecha);
//Ruta para actualizar salida 
router.put("/api/horario/ActualizarSalida", updateSalidaById);
//Ruta para actualizar entrada
router.put("/api/horario/ActualizarEntrada", updateEntradaById);
//Ruta para agregar registro
router.post("/api/horario/agregarRegistro", agregarRegistro);
//Ruta para informe personal
router.post("/api/horario/informePersonal", informePersonalById);
//Ruta para informe novedades
router.post("/api/horario/informeNovedad", informeNovedad);
//Ruta para informe de peligro
router.post("/api/horario/InformeRiesgo", informePeligro);
//Concatenar
router.post("/api/horario/concatenar",upload.array('files'), concatenar)
//Eliminar Registro 
router.delete("/api/horario/delete/:Hid/:Fecha", deleteRegistroByHidAndFecha)
//Restar tiempo de sabado
router.post("/api/horario/restaTiempo", restarTiempoSabado)
export default router