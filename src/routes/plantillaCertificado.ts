import { Router } from 'express';
import { validateAdmin, validateToken } from '../controllers/archivo';
import {
  getPlantillasAdmin,
  getPlantillasActivas,
  createPlantilla,
  updatePlantilla,
  togglePlantilla,
  deletePlantilla,
  generarPdfDesdeTemplate,
} from '../controllers/plantillaCertificado';

const router = Router();

router.get('/', validateToken, getPlantillasActivas);
router.get('/admin', validateAdmin, getPlantillasAdmin);
router.post('/', validateAdmin, createPlantilla);
router.put('/:id', validateAdmin, updatePlantilla);
router.patch('/:id/toggle', validateAdmin, togglePlantilla);
router.delete('/:id', validateAdmin, deletePlantilla);
router.get('/generar/:codigo/:Uid', validateToken, generarPdfDesdeTemplate);

export default router;
