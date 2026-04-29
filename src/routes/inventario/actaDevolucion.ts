import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerDispositivosEntregados,
    obtenerActasDevolucion,
    obtenerActaDevolucionPorId,
    crearActaDevolucion,
    enviarSolicitudFirmaDevolucion,
    obtenerActaDevolucionPorToken,
    firmarActaDevolucionConToken,
    rechazarActaDevolucionConToken,
    reenviarCorreoDevolucion,
    eliminarActaDevolucion
} from '../../controllers/inventario/actaDevolucion';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// Accedidas por el receptor desde el correo
// ==========================================
router.get('/publica/:token', obtenerActaDevolucionPorToken);
router.post('/publica/:token/firmar', firmarActaDevolucionConToken);
router.post('/publica/:token/rechazar', rechazarActaDevolucionConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================

// Rutas específicas antes de las dinámicas
router.get('/dispositivos-entregados', validateToken, obtenerDispositivosEntregados);

// Rutas generales
router.get('/', validateToken, obtenerActasDevolucion);
router.get('/:id', validateToken, obtenerActaDevolucionPorId);

// Crear acta con fotos
router.post('/', validateToken, uploadInventario.any(), crearActaDevolucion);

// Enviar y reenviar correo de firma
router.post('/enviar-firma/:id', validateToken, enviarSolicitudFirmaDevolucion);
router.post('/reenviar-firma/:id', validateToken, reenviarCorreoDevolucion);

// Eliminar acta
router.delete('/:id', validateToken, eliminarActaDevolucion);

export default router;
