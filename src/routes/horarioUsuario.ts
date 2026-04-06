import { Router } from 'express';
import { getHorarioUsuario, updateHorarioUsuario, inicializarHorariosGlobal } from '../controllers/horarioUsuario';

const router = Router();

// Obtener horario semanal de un usuario
router.get('/:uid', getHorarioUsuario);

// Actualizar horario semanal de un usuario
router.put('/:uid', updateHorarioUsuario);

// Inicializar horarios estándar para todos los usuarios sin horario
router.post('/inicializar', inicializarHorariosGlobal);

export default router;
