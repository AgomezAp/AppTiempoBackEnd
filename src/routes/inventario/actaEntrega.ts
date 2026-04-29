import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerActas,
    obtenerActaPorId,
    crearActaEntrega,
    registrarDevolucion,
    obtenerActasActivas,
    obtenerHistorialDispositivo,
    cancelarActaEntrega
} from '../../controllers/inventario/actaEntrega';

const router = Router();

// Rutas específicas antes de las dinámicas
router.get('/activas', validateToken, obtenerActasActivas);
router.get('/historial/:dispositivoId', validateToken, obtenerHistorialDispositivo);

// Rutas generales
router.get('/', validateToken, obtenerActas);
router.get('/:id', validateToken, obtenerActaPorId);

// Crear acta de entrega con fotos
router.post('/', validateToken, uploadInventario.any(), crearActaEntrega);

// Registrar devolución
router.post('/:id/devolucion', validateToken, uploadInventario.any(), registrarDevolucion);

// Cancelar acta pendiente de firma
router.delete('/:id', validateToken, cancelarActaEntrega);

export default router;
