import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import validateToken from './validateToken';
import {
    inicializarWhatsApp,
    obtenerEstadoWhatsApp,
    sseWhatsApp,
    desconectarWhatsApp,
    enviarMensaje,
    notificarCapacitacion,
    enviarMensajeMasivo,
} from '../controllers/whatsapp';

const router = Router();

const validateAdminRole = (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).userRole !== 'Admin') {
        res.status(403).json({ msg: 'Acceso solo para administradores' });
        return;
    }
    next();
};

// Estado y conexión
router.post('/inicializar', validateToken, validateAdminRole, inicializarWhatsApp);
router.get('/estado', validateToken, validateAdminRole, obtenerEstadoWhatsApp);
router.get('/sse', validateToken, validateAdminRole, sseWhatsApp);
router.post('/desconectar', validateToken, validateAdminRole, desconectarWhatsApp);

// Enviar mensajes
router.post('/enviar', validateToken, validateAdminRole, enviarMensaje);
router.post('/notificar-capacitacion', validateToken, validateAdminRole, notificarCapacitacion);
router.post('/enviar-masivo', validateToken, validateAdminRole, enviarMensajeMasivo);

export default router;
