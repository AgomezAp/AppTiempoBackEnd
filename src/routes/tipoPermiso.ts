import { Router } from 'express';
import { validateAdmin, validateToken } from '../controllers/archivo';
import {
  getTiposPermiso,
  getTiposPermisoAdmin,
  createTipoPermiso,
  updateTipoPermiso,
  toggleTipoPermiso,
  reorderTiposPermiso,
} from '../controllers/tipoPermiso';

const router = Router();

// Público para usuarios autenticados (usa el form de permisos)
router.get('/', validateToken, getTiposPermiso);

// Admin: lista todos (incluyendo inactivos) y gestión completa
router.get('/admin', validateAdmin, getTiposPermisoAdmin);
router.post('/', validateAdmin, createTipoPermiso);
router.put('/:id', validateAdmin, updateTipoPermiso);
router.patch('/:id/toggle', validateAdmin, toggleTipoPermiso);
router.patch('/reorder/bulk', validateAdmin, reorderTiposPermiso);

export default router;
