import { Router } from 'express';
import validateToken from '../validateToken';
import {
    obtenerActasConsumibles,
    obtenerActasPorTipo,
    obtenerActaConsumiblePorId,
    crearActaConsumible,
    obtenerActaConsumiblePorToken,
    firmarActaConsumible,
    rechazarActaConsumible,
    obtenerEstadisticasActasConsumibles,
    reenviarCorreoFirmaConsumible,
    cancelarActaConsumible,
    eliminarActaConsumible
} from '../../controllers/inventario/actaConsumible';

const router = Router();

// Rutas públicas (para firma por correo)
router.get('/firma/:token', obtenerActaConsumiblePorToken);
router.post('/firma/:token', firmarActaConsumible);
router.post('/rechazar/:token', rechazarActaConsumible);

// Rutas específicas antes de las dinámicas
router.get('/tipo/:codigo', validateToken, obtenerActasPorTipo);
router.get('/estadisticas', validateToken, obtenerEstadisticasActasConsumibles);

// Rutas protegidas generales
router.get('/', validateToken, obtenerActasConsumibles);
router.get('/:id', validateToken, obtenerActaConsumiblePorId);
router.post('/', validateToken, crearActaConsumible);
router.post('/:id/reenviar', validateToken, reenviarCorreoFirmaConsumible);

// Cancelar acta pendiente de firma
router.delete('/:id', validateToken, cancelarActaConsumible);

// Eliminar acta cancelada/rechazada permanentemente
router.delete('/:id/eliminar', validateToken, eliminarActaConsumible);

export default router;
