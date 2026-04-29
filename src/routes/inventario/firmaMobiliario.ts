import { Router } from 'express';
import validateToken from '../validateToken';
import {
    enviarSolicitudFirmaMobiliario,
    obtenerActaMobiliarioPorToken,
    firmarActaMobiliarioConToken,
    rechazarActaMobiliarioConToken,
    reenviarCorreoFirmaMobiliario,
    obtenerEstadoFirmaMobiliario
} from '../../controllers/inventario/firmaMobiliario';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// Accedidas por el receptor desde el correo
// ==========================================
router.get('/publica/:token', obtenerActaMobiliarioPorToken);
router.post('/publica/:token/firmar', firmarActaMobiliarioConToken);
router.post('/publica/:token/rechazar', rechazarActaMobiliarioConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================
router.post('/enviar/:id', validateToken, enviarSolicitudFirmaMobiliario);
router.post('/reenviar/:id', validateToken, reenviarCorreoFirmaMobiliario);
router.get('/estado/:id', validateToken, obtenerEstadoFirmaMobiliario);

export default router;
