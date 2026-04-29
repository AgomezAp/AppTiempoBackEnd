import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerActasMobiliario,
    obtenerActaMobiliarioPorId,
    crearActaMobiliario,
    registrarDevolucionMobiliario,
    obtenerActasMobiliarioActivas,
    obtenerHistorialMobiliarioActas,
    cancelarActaMobiliario,
    eliminarActaMobiliario
} from '../../controllers/inventario/actaMobiliario';

const router = Router();

// Rutas específicas antes de las dinámicas
router.get('/activas', validateToken, obtenerActasMobiliarioActivas);
router.get('/historial/:mobiliarioId', validateToken, obtenerHistorialMobiliarioActas);

// Rutas generales
router.get('/', validateToken, obtenerActasMobiliario);
router.get('/:id', validateToken, obtenerActaMobiliarioPorId);

// Crear acta con fotos
router.post('/', validateToken, uploadInventario.any(), crearActaMobiliario);

// Registrar devolución
router.post('/:id/devolucion', validateToken, uploadInventario.any(), registrarDevolucionMobiliario);

// Cancelar acta pendiente de firma
router.delete('/:id', validateToken, cancelarActaMobiliario);

// Eliminar acta cancelada/rechazada permanentemente
router.delete('/:id/eliminar', validateToken, eliminarActaMobiliario);

export default router;
