import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerMobiliario,
    obtenerMobiliarioDisponible,
    obtenerMobiliarioPorId,
    registrarMobiliario,
    actualizarMobiliario,
    agregarStockMobiliario,
    retirarStockMobiliario,
    ajustarStockMobiliario,
    obtenerEstadisticasMobiliario,
    desactivarMobiliario,
    obtenerHistorialMobiliario,
    convertirMobiliarioAStock
} from '../../controllers/inventario/mobiliario';

const router = Router();

// Rutas específicas primero
router.get('/disponibles', validateToken, obtenerMobiliarioDisponible);
router.get('/estadisticas', validateToken, obtenerEstadisticasMobiliario);

// Rutas generales
router.get('/', validateToken, obtenerMobiliario);
router.get('/:id', validateToken, obtenerMobiliarioPorId);
router.get('/:id/historial', validateToken, obtenerHistorialMobiliario);

// Registro y actualización con foto
router.post('/', validateToken, uploadInventario.single('foto'), registrarMobiliario);
router.put('/:id', validateToken, uploadInventario.single('foto'), actualizarMobiliario);

// Gestión de stock
router.post('/:id/agregar-stock', validateToken, agregarStockMobiliario);
router.post('/:id/retirar-stock', validateToken, retirarStockMobiliario);
router.post('/:id/ajustar-stock', validateToken, ajustarStockMobiliario);
router.post('/:id/convertir-stock', validateToken, convertirMobiliarioAStock);

// Desactivar
router.delete('/:id', validateToken, desactivarMobiliario);

export default router;
