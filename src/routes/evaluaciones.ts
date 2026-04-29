import { Router, RequestHandler } from 'express';
import { validateToken, validateAdmin } from './validateToken';
import {
    crearPeriodo, listarPeriodos, actualizarPeriodo,
    listarCategorias, crearCategoria, crearCriterio,
    crearEvaluacion, obtenerEvaluacion, listarEvaluacionesPeriodo,
    guardarCalificaciones, guardarObjetivos, completarEvaluacion,
    graficaRadar, graficaComparativoArea, graficaEvolucion,
    graficaDistribucion, graficaDashboard
} from '../controllers/evaluaciones';

const router = Router();

// Cast para controladores que retornan Promise<Response> (compatibilidad Express v5 types)
const rh = (fn: Function): RequestHandler => fn as RequestHandler;

// ---- Períodos de evaluación ----
router.get('/periodos', validateToken, rh(listarPeriodos));
router.post('/periodos', validateToken, validateAdmin, rh(crearPeriodo));
router.put('/periodos/:id', validateToken, validateAdmin, rh(actualizarPeriodo));

// ---- Categorías y criterios ----
router.get('/categorias', validateToken, rh(listarCategorias));
router.post('/categorias', validateToken, validateAdmin, rh(crearCategoria));
router.post('/categorias/:categoriaId/criterios', validateToken, validateAdmin, rh(crearCriterio));

// ---- GRÁFICAS (antes que /:id para evitar conflicto de rutas) ----
// Radar: perfil de competencias de un empleado en un período
router.get('/graficas/radar/:uid/:periodoId', validateToken, rh(graficaRadar));
// Barras: comparativo de empleados de un área en un período
router.get('/graficas/comparativo-area/:areaId/:periodoId', validateToken, rh(graficaComparativoArea));
// Línea temporal: evolución histórica de un empleado
router.get('/graficas/evolucion/:uid', validateToken, rh(graficaEvolucion));
// Torta/Pie: distribución de calificaciones en un período
router.get('/graficas/distribucion/:periodoId', validateToken, rh(graficaDistribucion));
// Dashboard KPIs del período completo
router.get('/graficas/dashboard/:periodoId', validateToken, rh(graficaDashboard));

// ---- CRUD Evaluaciones ----
router.get('/periodo/:periodoId', validateToken, rh(listarEvaluacionesPeriodo));
router.get('/:id', validateToken, rh(obtenerEvaluacion));
router.post('/', validateToken, rh(crearEvaluacion));
router.put('/:id/calificaciones', validateToken, rh(guardarCalificaciones));
router.put('/:id/objetivos', validateToken, rh(guardarObjetivos));
router.put('/:id/completar', validateToken, rh(completarEvaluacion));

export default router;
