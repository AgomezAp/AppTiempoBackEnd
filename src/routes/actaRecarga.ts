import { Router } from 'express';
import {
  getActas,
  getActaById,
  crearActa,
  actualizarActa,
  enviarActaParaRevision,
  getActaByToken,
  firmarActaRevisor,
  eliminarActa,
  getUsuariosConAcceso,
  agregarAcceso,
  actualizarAcceso,
  eliminarAcceso,
  verificarMiAcceso,
  getUsuariosDisponibles,
  testEmail,
} from '../controllers/actaRecarga';
import { validateAdmin, validateToken } from '../controllers/archivo';

const router = Router();

// ==================== RUTA DE PRUEBA DE EMAIL ====================
// Acceder desde el navegador: http://localhost:3010/api/actas-recargas/test-email
router.get('/test-email', testEmail);

// ==================== RUTAS PÚBLICAS (con token de firma) ====================

// Obtener acta por token de firma (para página pública de firma)
router.get('/firmar/:token', getActaByToken);

// Firmar acta como revisor
router.post('/firmar/:token', firmarActaRevisor);

// ==================== RUTAS PROTEGIDAS ====================

// Verificar acceso del usuario actual
router.get('/mi-acceso', validateToken, verificarMiAcceso);

// Obtener usuarios disponibles para asignar como revisor
router.get('/usuarios-disponibles', validateToken, getUsuariosDisponibles);

// ==================== RUTAS DE ADMIN - GESTIÓN DE ACCESOS ====================
// IMPORTANTE: Estas rutas deben ir ANTES de /:id para que Express no las confunda con un parámetro

// Obtener todos los usuarios con acceso
router.get('/accesos/lista', validateAdmin, getUsuariosConAcceso);

// Agregar acceso a un usuario
router.post('/accesos', validateAdmin, agregarAcceso);

// Actualizar acceso de un usuario
router.put('/accesos/:id', validateAdmin, actualizarAcceso);

// Eliminar acceso de un usuario
router.delete('/accesos/:id', validateAdmin, eliminarAcceso);

// ==================== CRUD de Actas ====================

router.get('/', validateToken, getActas);
router.get('/:id', validateToken, getActaById);
router.post('/', validateToken, crearActa);
router.put('/:id', validateToken, actualizarActa);
router.delete('/:id', validateToken, eliminarActa);

// Enviar acta para revisión (firma del emisor y envía correo al revisor)
router.post('/:id/enviar', validateToken, enviarActaParaRevision);

export default router;
