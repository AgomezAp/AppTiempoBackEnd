import { Router } from 'express';
import { validateAdmin } from '../controllers/archivo';
import {
  getDestinatarios,
  createDestinatario,
  updateDestinatario,
  deleteDestinatario,
  toggleDestinatario,
} from '../controllers/destinatarioPermiso';

const router = Router();

router.get('/', validateAdmin, getDestinatarios);
router.post('/', validateAdmin, createDestinatario);
router.put('/:id', validateAdmin, updateDestinatario);
router.delete('/:id', validateAdmin, deleteDestinatario);
router.patch('/:id/toggle', validateAdmin, toggleDestinatario);

export default router;
