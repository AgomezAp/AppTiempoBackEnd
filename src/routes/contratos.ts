import { Router, RequestHandler } from 'express';
import { validateToken, validateAdmin } from './validateToken';
import {
    obtenerContratosEmpleado,
    obtenerContratosVigentes,
    obtenerContrato,
    crearContrato,
    actualizarContrato,
    agregarModificacion,
    generarPdfContrato
} from '../controllers/contratos';

const router = Router();

// Cast para controladores que retornan Promise<Response> (compatibilidad Express v5 types)
const rh = (fn: Function): RequestHandler => fn as RequestHandler;

// Historial de contratos de un empleado
router.get('/empleado/:uid', validateToken, rh(obtenerContratosEmpleado));

// Listado de contratos vigentes (Admin)
router.get('/vigentes', validateToken, validateAdmin, rh(obtenerContratosVigentes));

// Detalle de un contrato
router.get('/:id', validateToken, rh(obtenerContrato));

// Crear contrato (Admin)
router.post('/', validateToken, validateAdmin, rh(crearContrato));

// Actualizar contrato (Admin)
router.put('/:id', validateToken, validateAdmin, rh(actualizarContrato));

// Agregar modificación/otrosí
router.post('/:id/modificaciones', validateToken, validateAdmin, rh(agregarModificacion));

// Generar PDF del contrato
router.get('/:id/pdf', validateToken, rh(generarPdfContrato));

export default router;
