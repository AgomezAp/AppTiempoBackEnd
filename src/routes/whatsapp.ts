import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import validateToken from './validateToken';
import {
    inicializarWhatsApp,
    obtenerEstadoWhatsApp,
    sseWhatsApp,
    desconectarWhatsApp,
    enviarMensaje,
    enviarMensajeMasivo,
    enviarMensajeConMedia,
    programarMensaje,
    obtenerProgramados,
    cancelarProgramado,
} from '../controllers/whatsapp';

const router = Router();

const validateAdminRole = (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).userRole !== 'Admin') {
        res.status(403).json({ msg: 'Acceso solo para administradores' });
        return;
    }
    next();
};

// Configuración multer para archivos WhatsApp
const uploadsDir = path.join(__dirname, '../../uploads/whatsapp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB max

// Estado y conexión
router.post('/inicializar', validateToken, validateAdminRole, inicializarWhatsApp);
router.get('/estado', validateToken, validateAdminRole, obtenerEstadoWhatsApp);
router.get('/sse', validateToken, validateAdminRole, sseWhatsApp);
router.post('/desconectar', validateToken, validateAdminRole, desconectarWhatsApp);

// Enviar mensajes
router.post('/enviar', validateToken, validateAdminRole, enviarMensaje);
router.post('/enviar-masivo', validateToken, validateAdminRole, enviarMensajeMasivo);
router.post('/enviar-media', validateToken, validateAdminRole, upload.single('archivo'), enviarMensajeConMedia);

// Mensajes programados
router.post('/programar', validateToken, validateAdminRole, upload.single('archivo'), programarMensaje);
router.get('/programados', validateToken, validateAdminRole, obtenerProgramados);
router.delete('/programados/:id', validateToken, validateAdminRole, cancelarProgramado);

export default router;
