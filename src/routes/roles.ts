import { Router } from 'express';
import { validateAdmin } from '../controllers/archivo';
import {
  listarRoles,
  getModulosRol,
  actualizarModulosRol,
  crearRolConModulos,
  actualizarNombreRol,
  eliminarRol,
  getMisModulos,
  getUsuariosRol,
  validateJWT,
} from '../controllers/roles';

const router = Router();

// Endpoint público autenticado: módulos del usuario actual (usado por navbar)
router.get('/mis-modulos', validateJWT, getMisModulos);

// CRUD de roles (solo Admin)
router.get('/', validateAdmin, listarRoles);
router.post('/', validateAdmin, crearRolConModulos);
router.put('/:id', validateAdmin, actualizarNombreRol);
router.delete('/:id', validateAdmin, eliminarRol);

// Módulos de un rol específico (solo Admin)
router.get('/:id/modulos', validateAdmin, getModulosRol);
router.put('/:id/modulos', validateAdmin, actualizarModulosRol);

// Usuarios de un rol específico (solo Admin)
router.get('/:id/usuarios', validateAdmin, getUsuariosRol);

export default router;
