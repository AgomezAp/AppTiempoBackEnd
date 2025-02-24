import { Router } from 'express';
import { 
    convertNovedad, 
    getNovedad, deleteNovedad,updateNovedadHora, updateNovedadEstado, aceptarTodo,
    errorNovedad
 } from '../controllers/novedad';
import validateToken  from './validateToken';

const router = Router();

// Ruta para agregar novedad
router.post("/api/novedad/NuevaNovedad", convertNovedad);
// Ruta para ver novedades 
router.get("/api/novedad/ObtenerNovedad", getNovedad);
// eliminar novedades
router.delete("/api/novedad/eliminarNovedad", deleteNovedad);
// editar horas novedad
router.put("/api/novedad/editarNovedadHora",  updateNovedadHora);
//editar estado novedad
router.put("/api/novedad/editarNovedadEstado",  updateNovedadEstado);
// aceptar todas las novedades
router.post("/api/novedad/aceptacion",  aceptarTodo);
// Volver a revisar
router.get("api/novedada/revision", errorNovedad)


export default router
