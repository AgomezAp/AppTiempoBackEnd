import { Router } from 'express';

import { 
    convertNovedad, 
    getNovedad, deleteNovedad
 } from '../controllers/novedad';
import validateToken  from './validateToken';

const router = Router();

// Ruta para agregar novedad
router.post("/api/novedad/NuevaNovedad", convertNovedad);
// Ruta para ver novedades 
router.get("/api/novedad/ObtenerNovedad", getNovedad);
// eliminar novedades
router.delete("/api/novedad/eliminarNovedad", deleteNovedad);

export default router
