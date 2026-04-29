import { Router } from 'express';
import validateToken from '../validateToken';
import { uploadInventario } from '../../config/inventario-multer';
import {
    obtenerDispositivos,
    obtenerDisponibles,
    obtenerDispositivoPorId,
    registrarDispositivo,
    actualizarDispositivo,
    cambiarEstadoDispositivo,
    obtenerEstadisticas,
    obtenerTrazabilidad,
    darDeBajaDispositivo,
    agregarStockDispositivo,
    retirarStockDispositivo,
    convertirAStock,
    eliminarDispositivo
} from '../../controllers/inventario/dispositivo';

const router = Router();

// Rutas específicas primero (antes de las rutas con parámetros dinámicos)
router.get('/disponibles', validateToken, obtenerDisponibles);
router.get('/estadisticas', validateToken, obtenerEstadisticas);

// Rutas con parámetros dinámicos
router.get('/', validateToken, obtenerDispositivos);
router.get('/:id/trazabilidad', validateToken, obtenerTrazabilidad);
router.get('/:id', validateToken, obtenerDispositivoPorId);

// Rutas de escritura
router.post('/', validateToken, uploadInventario.array('fotos', 10), registrarDispositivo);
router.put('/:id', validateToken, actualizarDispositivo);
router.patch('/:id/estado', validateToken, cambiarEstadoDispositivo);
router.patch('/:id/baja', validateToken, darDeBajaDispositivo);

// Rutas para gestión de stock
router.post('/:id/agregar-stock', validateToken, agregarStockDispositivo);
router.post('/:id/retirar-stock', validateToken, retirarStockDispositivo);
router.post('/:id/convertir-stock', validateToken, convertirAStock);

// Eliminar dispositivo
router.delete('/:id', validateToken, eliminarDispositivo);

export default router;
