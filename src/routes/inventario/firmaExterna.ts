import { Router } from 'express';
import validateToken from '../validateToken';
import {
    enviarSolicitudFirma,
    obtenerActaPorToken,
    firmarActaConToken,
    rechazarActaConToken,
    reenviarCorreoFirma,
    obtenerEstadoFirma
} from '../../controllers/inventario/firmaExterna';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// Accedidas por el receptor desde el correo
// ==========================================
router.get('/publica/:token', obtenerActaPorToken);
router.post('/publica/:token/firmar', firmarActaConToken);
router.post('/publica/:token/rechazar', rechazarActaConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================
router.post('/enviar/:id', validateToken, enviarSolicitudFirma);
router.post('/reenviar/:id', validateToken, reenviarCorreoFirma);
router.get('/estado/:id', validateToken, obtenerEstadoFirma);

export default router;
