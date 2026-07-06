import { Router } from 'express';
import { validateAdmin, validateToken } from '../controllers/archivo';
import {
  getPlantillas,
  getPlantillaById,
  createPlantilla,
  updatePlantilla,
  desactivarPlantilla,
  eliminarPlantilla,
  getTodasAsignaciones,
  getInventariosUsuario,
  asignarInventario,
  asignarInventarioMultiple,
  actualizarAsignacion,
  removerInventario,
} from '../controllers/plantillaInventario';

const router = Router();

// --- Rutas específicas ANTES de /:id para evitar colisiones ---

// Plantillas (solo admin)
router.get('/', validateAdmin, getPlantillas);
router.post('/', validateAdmin, createPlantilla);

// Asignaciones - específicas antes del wildcard /:id
router.get('/asignaciones/todas', validateAdmin, getTodasAsignaciones);
router.get('/usuario/:Uid', validateToken, getInventariosUsuario);
router.post('/asignar', validateAdmin, asignarInventario);
router.post('/asignar/multiple', validateAdmin, asignarInventarioMultiple);
router.put('/asignar/:id', validateAdmin, actualizarAsignacion);
router.delete('/asignar/:id', validateAdmin, removerInventario);

// Plantillas por id - al final para no capturar rutas específicas
router.get('/:id', validateAdmin, getPlantillaById);
router.put('/:id', validateAdmin, updatePlantilla);
router.patch('/:id/toggle', validateAdmin, desactivarPlantilla);
router.delete('/:id', validateAdmin, eliminarPlantilla);

export default router;
