import { Router } from 'express';
import validateToken from '../validateToken';
import {
    obtenerAnalistas,
    obtenerAnalistasActivos,
    obtenerAnalistaPorId,
    registrarAnalista,
    actualizarAnalista,
    desactivarAnalista,
    reactivarAnalista,
    eliminarAnalista
} from '../../controllers/inventario/analista';

const router = Router();

router.get('/', validateToken, obtenerAnalistas);
router.get('/activos', validateToken, obtenerAnalistasActivos);
router.get('/:Aid', validateToken, obtenerAnalistaPorId);
router.post('/', validateToken, registrarAnalista);
router.patch('/:Aid', validateToken, actualizarAnalista);
router.patch('/:Aid/desactivar', validateToken, desactivarAnalista);
router.patch('/:Aid/reactivar', validateToken, reactivarAnalista);
router.delete('/:Aid', validateToken, eliminarAnalista);

export default router;
