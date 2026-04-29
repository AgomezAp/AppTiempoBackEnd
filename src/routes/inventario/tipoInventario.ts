import { Router } from 'express';
import validateToken from '../validateToken';
import {
    obtenerTiposInventario,
    obtenerTipoPorId,
    obtenerTipoPorCodigo,
    crearTipoInventario,
    actualizarTipoInventario
} from '../../controllers/inventario/tipoInventario';

const router = Router();

// Rutas públicas (catálogo de tipos)
router.get('/', obtenerTiposInventario);
router.get('/codigo/:codigo', obtenerTipoPorCodigo);
router.get('/:id', obtenerTipoPorId);

// Rutas protegidas (administración)
router.post('/', validateToken, crearTipoInventario);
router.put('/:id', validateToken, actualizarTipoInventario);

export default router;
