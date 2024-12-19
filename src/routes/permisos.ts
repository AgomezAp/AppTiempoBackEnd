import { Router } from 'express';

import {
  createPermiso,
  getAllUsersWithPermisos,
  getPermisosByUserId,
} from '../controllers/permisos';

const router = Router();

router.post('/api/permisos/crear', createPermiso);
router.get('/api/permisos/:id', getPermisosByUserId);
router.get('/api/admin/users', getAllUsersWithPermisos);

export default router;