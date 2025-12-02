import { Router } from 'express';
import {
  getConfigVigente,
  getAllConfigs,
  createConfig,
  updateConfig,
  toggleVigencia,
  deleteConfig
} from '../controllers/nominaConfig';
import validateToken from './validateToken';

const router = Router();

// Obtener configuración vigente (acceso para todos los usuarios autenticados)
router.get('/vigente', validateToken, getConfigVigente);

// Obtener todas las configuraciones - historial (solo Admin)
router.get('/', validateToken, getAllConfigs);

// Crear nueva configuración (solo Admin)
router.post('/', validateToken, createConfig);

// Actualizar configuración existente (solo Admin)
router.put('/:id', validateToken, updateConfig);

// Activar una configuración específica como vigente (solo Admin)
router.patch('/:id/vigencia', validateToken, toggleVigencia);

// Eliminar configuración (solo Admin)
router.delete('/:id', validateToken, deleteConfig);

export default router;
