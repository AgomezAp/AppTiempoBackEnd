import { Router } from 'express';
import { guardarPlan, getMiPlan, getTodosLosPlanes, eliminarPlan } from '../controllers/compensacion';
import validateToken from './validateToken';

const router = Router();

// Guardar o actualizar el plan del usuario en sesión
router.post('/', validateToken, guardarPlan);

// Obtener los planes del usuario en sesión
router.get('/mi-plan', validateToken, getMiPlan);

// Obtener todos los planes (admin solamente, validado en el controller)
router.get('/', validateToken, getTodosLosPlanes);

// Eliminar un plan
router.delete('/:id', validateToken, eliminarPlan);

export default router;
