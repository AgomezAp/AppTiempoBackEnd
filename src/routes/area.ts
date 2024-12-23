import { Router } from 'express';

import {
  createArea,
  deleteArea,
  getAllAreas,
  getAreaById,
  updateArea,
} from '../controllers/area';

const router = Router();

router.get('/api/traerAreas', getAllAreas);
router.get('/api/areaId/:id', getAreaById);
router.post('/api/nuevaArea', createArea);
router.put('/api/actualizarArea/:id', updateArea);
router.delete('/api/BorrarArea/:id', deleteArea);

export default router;