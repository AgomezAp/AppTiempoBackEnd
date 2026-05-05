import { Router, Request, Response } from 'express';

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
    restarTiempoSabado,
    updateExtra,
    nuevaNovedad,
    getHistoricoExtras,
    getHistoricoExtrasAll,
    getDetalleExtras,
    getUploadHistorial,
    revertUpload,
    recalcularSumatoria
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
//Ruta para cambiar extras
router.put("/api/horario/updateExtra", updateExtra)
//Ruta para agregar registro
router.post("/api/horario/agregarRegistro", agregarRegistro);
//Ruta para informe personal
router.post("/api/horario/informePersonal", informePersonalById);
//Ruta para informe novedades
router.post("/api/horario/informeNovedad", nuevaNovedad);
//Ruta para informe de peligro
router.post("/api/horario/InformeRiesgo", informePeligro);
router.post("/api/horario/NuevoInforme", informeNovedad);
//Concatenar
router.post("/api/horario/concatenar",upload.array('files'), concatenar)
//Eliminar Registro 
router.delete("/api/horario/delete/:Hid/:Fecha", deleteRegistroByHidAndFecha)
//Restar tiempo de sabado
router.post("/api/horario/restaTiempo", async (req: Request, res: Response) => {
    await restarTiempoSabado();
    res.status(200).json({ message: 'Tiempo restado correctamente' });
})
//Historial de horas extras por usuario
router.get("/api/horario/historicoExtras/:id", getHistoricoExtras)
//Historial de horas extras por fecha (todos)
router.get("/api/horario/historicoExtras/fecha/:fecha", getHistoricoExtrasAll)
//Detalle diario de horas extras por usuario
router.get("/api/horario/detalleExtras/:id", getDetalleExtras)
//Historial de subidas
router.get("/api/horario/uploadHistorial", getUploadHistorial)
//Revertir una subida
router.post("/api/horario/revertirUpload/:id", revertUpload)
//Recalcular Sumatoria desde registros de asistencia (fallback de corrección)
router.post("/api/horario/recalcularSumatoria", recalcularSumatoria)
export default router