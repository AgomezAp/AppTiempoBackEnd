import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerConsumibles,
    obtenerConsumiblesPorTipo,
    obtenerConsumiblePorId,
    registrarConsumible,
    actualizarConsumible,
    agregarStock,
    retirarStock,
    ajustarStock,
    obtenerAlertasStock,
    obtenerEstadisticasConsumibles,
    desactivarConsumible,
    obtenerHistorialConsumible,
    obtenerConsumiblesDisponibles
} from '../../controllers/inventario/consumible';

const router = Router();

// Rutas específicas primero
router.get('/disponibles', validateToken, obtenerConsumiblesDisponibles);
router.get('/alertas', validateToken, obtenerAlertasStock);
router.get('/estadisticas', validateToken, obtenerEstadisticasConsumibles);
router.get('/tipo/:codigo', validateToken, obtenerConsumiblesPorTipo);

// Rutas generales
router.get('/', validateToken, obtenerConsumibles);
router.get('/:id', validateToken, obtenerConsumiblePorId);
router.get('/:id/historial', validateToken, obtenerHistorialConsumible);

// Registro con foto
router.post('/', validateToken, uploadInventario.single('foto'), registrarConsumible);

// Actualizar
router.put('/:id', validateToken, actualizarConsumible);

// Gestión de stock
router.patch('/:id/agregar-stock', validateToken, agregarStock);
router.patch('/:id/retirar-stock', validateToken, retirarStock);
router.patch('/:id/ajustar-stock', validateToken, ajustarStock);

// Desactivar
router.delete('/:id', validateToken, desactivarConsumible);

export default router;
