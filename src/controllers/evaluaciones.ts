import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../database/connection';
import {
    PeriodoEvaluacion, CategoriaEvaluacion, CriterioEvaluacion,
    EvaluacionDesempeno, CalificacionDetalle, EvaluacionObjetivo
} from '../models/evaluaciones';
import { User } from '../models/user';
import { Area } from '../models/area';

// ============================================================
// PERIODOS DE EVALUACIÓN
// ============================================================

export const crearPeriodo = async (req: Request, res: Response) => {
    try {
        const periodo = await PeriodoEvaluacion.create(req.body);
        res.status(201).json({ msg: 'Período de evaluación creado', periodo });
    } catch (error) {
        console.error('Error al crear período:', error);
        res.status(500).json({ msg: 'Error al crear el período de evaluación' });
    }
};

export const listarPeriodos = async (req: Request, res: Response) => {
    try {
        const periodos = await PeriodoEvaluacion.findAll({
            order: [['fecha_inicio', 'DESC']]
        });
        res.json(periodos);
    } catch (error) {
        res.status(500).json({ msg: 'Error al listar los períodos' });
    }
};

export const actualizarPeriodo = async (req: Request, res: Response) => {
    try {
        const periodo = await PeriodoEvaluacion.findByPk(req.params.id);
        if (!periodo) return res.status(404).json({ msg: 'Período no encontrado' });
        await periodo.update(req.body);
        res.json({ msg: 'Período actualizado', periodo });
    } catch (error) {
        res.status(500).json({ msg: 'Error al actualizar el período' });
    }
};

// ============================================================
// CATEGORÍAS Y CRITERIOS
// ============================================================

export const listarCategorias = async (req: Request, res: Response) => {
    try {
        const categorias = await CategoriaEvaluacion.findAll({
            where: { activo: true },
            include: [{ model: CriterioEvaluacion, as: 'criterios', where: { activo: true } }],
            order: [['orden', 'ASC'], [{ model: CriterioEvaluacion, as: 'criterios' }, 'orden', 'ASC']]
        });
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ msg: 'Error al listar las categorías' });
    }
};

export const crearCategoria = async (req: Request, res: Response) => {
    try {
        const cat = await CategoriaEvaluacion.create(req.body);
        res.status(201).json({ msg: 'Categoría creada', categoria: cat });
    } catch (error) {
        res.status(500).json({ msg: 'Error al crear la categoría' });
    }
};

export const crearCriterio = async (req: Request, res: Response) => {
    try {
        const criterio = await CriterioEvaluacion.create({ ...req.body, categoria_id: req.params.categoriaId });
        res.status(201).json({ msg: 'Criterio creado', criterio });
    } catch (error) {
        res.status(500).json({ msg: 'Error al crear el criterio' });
    }
};

// ============================================================
// EVALUACIONES
// ============================================================

export const crearEvaluacion = async (req: Request, res: Response) => {
    try {
        const { periodo_id, evaluado_uid, evaluador_uid } = req.body;

        // Verificar que no existe una evaluación para este empleado en este período
        const existe = await EvaluacionDesempeno.findOne({ where: { periodo_id, evaluado_uid } });
        if (existe) return res.status(400).json({ msg: 'Ya existe una evaluación para este colaborador en este período' });

        const evaluacion = await EvaluacionDesempeno.create({
            periodo_id, evaluado_uid, evaluador_uid, estado: 'pendiente'
        });
        res.status(201).json({ msg: 'Evaluación creada', evaluacion });
    } catch (error) {
        console.error('Error al crear evaluación:', error);
        res.status(500).json({ msg: 'Error al crear la evaluación' });
    }
};

export const obtenerEvaluacion = async (req: Request, res: Response) => {
    try {
        const evaluacion = await EvaluacionDesempeno.findByPk(req.params.id, {
            include: [
                { model: PeriodoEvaluacion, as: 'periodo' },
                {
                    model: CalificacionDetalle,
                    as: 'calificaciones',
                    include: [{
                        model: CriterioEvaluacion,
                        as: 'criterio',
                        include: [{ model: CategoriaEvaluacion, as: 'categoria' }]
                    }]
                },
                { model: EvaluacionObjetivo, as: 'objetivos' }
            ]
        });
        if (!evaluacion) return res.status(404).json({ msg: 'Evaluación no encontrada' });

        // Agregar datos del evaluado y evaluador
        const [evaluado, evaluador] = await Promise.all([
            User.findByPk((evaluacion as any).evaluado_uid, { attributes: ['Uid', 'name', 'lastName', 'cargo', 'Aid'] }),
            User.findByPk((evaluacion as any).evaluador_uid, { attributes: ['Uid', 'name', 'lastName', 'cargo'] })
        ]);

        res.json({ ...evaluacion.toJSON(), evaluado, evaluador });
    } catch (error) {
        console.error('Error al obtener evaluación:', error);
        res.status(500).json({ msg: 'Error al obtener la evaluación' });
    }
};

export const listarEvaluacionesPeriodo = async (req: Request, res: Response) => {
    try {
        const { periodoId } = req.params;
        const evaluaciones = await EvaluacionDesempeno.findAll({
            where: { periodo_id: periodoId },
            order: [['created_at', 'DESC']]
        });

        // Enriquecer con datos de usuarios
        const evaluacionesConDatos = await Promise.all(
            evaluaciones.map(async (ev) => {
                const evJson = ev.toJSON() as any;
                const [evaluado] = await Promise.all([
                    User.findByPk(evJson.evaluado_uid, { attributes: ['Uid', 'name', 'lastName', 'cargo', 'Aid'] })
                ]);
                return { ...evJson, evaluado };
            })
        );

        res.json(evaluacionesConDatos);
    } catch (error) {
        res.status(500).json({ msg: 'Error al listar evaluaciones del período' });
    }
};

export const guardarCalificaciones = async (req: Request, res: Response) => {
    try {
        const evaluacion = await EvaluacionDesempeno.findByPk(req.params.id);
        if (!evaluacion) return res.status(404).json({ msg: 'Evaluación no encontrada' });
        if ((evaluacion as any).estado === 'aprobada') {
            return res.status(400).json({ msg: 'No se puede modificar una evaluación aprobada' });
        }

        const { calificaciones } = req.body;
        // calificaciones: [{ criterio_id, calificacion, comentario }]

        // Guardar/actualizar cada calificación (upsert)
        for (const cal of calificaciones) {
            await CalificacionDetalle.upsert({
                evaluacion_id: parseInt(req.params.id),
                criterio_id: cal.criterio_id,
                calificacion: cal.calificacion,
                comentario: cal.comentario
            }, { conflictFields: ['evaluacion_id', 'criterio_id'] } as any);
        }

        // Calcular calificación final ponderada
        const calificacionFinal = await calcularCalificacionFinal(parseInt(req.params.id));
        await evaluacion.update({
            calificacion_final: calificacionFinal,
            estado: 'en_proceso'
        });

        res.json({ msg: 'Calificaciones guardadas', calificacion_final: calificacionFinal });
    } catch (error) {
        console.error('Error al guardar calificaciones:', error);
        res.status(500).json({ msg: 'Error al guardar las calificaciones' });
    }
};

export const guardarObjetivos = async (req: Request, res: Response) => {
    try {
        const evaluacion = await EvaluacionDesempeno.findByPk(req.params.id);
        if (!evaluacion) return res.status(404).json({ msg: 'Evaluación no encontrada' });

        const { objetivos } = req.body;
        // objetivos: [{ descripcion, meta_esperada, resultado_obtenido, peso_porcentaje, cumplimiento_pct, calificacion }]

        // Eliminar objetivos existentes y recrear
        await EvaluacionObjetivo.destroy({ where: { evaluacion_id: req.params.id } });
        const nuevosObjetivos = await EvaluacionObjetivo.bulkCreate(
            objetivos.map((obj: any) => ({ ...obj, evaluacion_id: parseInt(req.params.id) }))
        );

        res.json({ msg: 'Objetivos guardados', objetivos: nuevosObjetivos });
    } catch (error) {
        console.error('Error al guardar objetivos:', error);
        res.status(500).json({ msg: 'Error al guardar los objetivos' });
    }
};

export const completarEvaluacion = async (req: Request, res: Response) => {
    try {
        const evaluacion = await EvaluacionDesempeno.findByPk(req.params.id);
        if (!evaluacion) return res.status(404).json({ msg: 'Evaluación no encontrada' });

        const { fortalezas, areas_mejora, compromisos, plan_mejora,
                comentarios_evaluador, comentarios_evaluado,
                firma_evaluador, firma_evaluado } = req.body;

        const calificacionFinal = await calcularCalificacionFinal(parseInt(req.params.id));

        await evaluacion.update({
            estado: 'completada',
            calificacion_final: calificacionFinal,
            fortalezas, areas_mejora, compromisos, plan_mejora,
            comentarios_evaluador, comentarios_evaluado,
            firma_evaluador, firma_evaluado,
            fecha_fin: new Date()
        });

        res.json({ msg: 'Evaluación completada', calificacion_final: calificacionFinal });
    } catch (error) {
        console.error('Error al completar evaluación:', error);
        res.status(500).json({ msg: 'Error al completar la evaluación' });
    }
};

// ============================================================
// FUNCIÓN AUXILIAR: Calcular calificación final ponderada
// ============================================================
async function calcularCalificacionFinal(evaluacionId: number): Promise<number> {
    const resultado = await sequelize.query<{ calificacion_final: number }>(`
        SELECT
            SUM(
                (cd.calificacion / cr.escala_max) * (cr.peso_porcentaje / 100) *
                (cat.peso_porcentaje / 100) * 5
            ) AS calificacion_final
        FROM calificaciones_detalle cd
        JOIN criterios_evaluacion cr ON cd.criterio_id = cr.id
        JOIN categorias_evaluacion cat ON cr.categoria_id = cat.id
        WHERE cd.evaluacion_id = :evaluacionId
        GROUP BY cd.evaluacion_id
    `, { replacements: { evaluacionId }, type: QueryTypes.SELECT });

    return resultado[0]?.calificacion_final || 0;
}

// ============================================================
// ENDPOINTS DE GRÁFICAS - Datos procesados para Chart.js
// ============================================================

/**
 * GET /api/evaluaciones/graficas/radar/:uid/:periodoId
 * Retorna datos para Radar Chart (perfil de competencias de un empleado en un período)
 */
export const graficaRadar = async (req: Request, res: Response) => {
    try {
        const { uid, periodoId } = req.params;

        const evaluacion = await EvaluacionDesempeno.findOne({
            where: { evaluado_uid: uid, periodo_id: periodoId }
        });
        if (!evaluacion) return res.status(404).json({ msg: 'Evaluación no encontrada para este período' });

        const datos = await sequelize.query<{
            categoria: string;
            promedio_categoria: number;
            peso_categoria: number;
        }>(`
            SELECT
                cat.nombre AS categoria,
                ROUND(AVG(cd.calificacion)::numeric, 2) AS promedio_categoria,
                cat.peso_porcentaje
            FROM calificaciones_detalle cd
            JOIN criterios_evaluacion cr ON cd.criterio_id = cr.id
            JOIN categorias_evaluacion cat ON cr.categoria_id = cat.id
            WHERE cd.evaluacion_id = :evaluacionId
            GROUP BY cat.id, cat.nombre, cat.peso_porcentaje
            ORDER BY cat.orden
        `, {
            replacements: { evaluacionId: (evaluacion as any).id },
            type: QueryTypes.SELECT
        });

        const colaborador = await User.findByPk(uid, { attributes: ['Uid', 'name', 'lastName'] });

        res.json({
            colaborador,
            labels: datos.map(d => d.categoria),
            datasets: [{
                label: `${(colaborador as any)?.name} ${(colaborador as any)?.lastName}`,
                data: datos.map(d => Number(d.promedio_categoria)),
                backgroundColor: 'rgba(26, 60, 110, 0.2)',
                borderColor: '#1a3c6e',
                pointBackgroundColor: '#1a3c6e'
            }],
            pesos: datos.map(d => d.peso_categoria)
        });
    } catch (error) {
        console.error('Error gráfica radar:', error);
        res.status(500).json({ msg: 'Error al generar datos de gráfica radar' });
    }
};

/**
 * GET /api/evaluaciones/graficas/comparativo-area/:areaId/:periodoId
 * Retorna datos para Bar Chart (comparativo de empleados en un área)
 */
export const graficaComparativoArea = async (req: Request, res: Response) => {
    try {
        const { areaId, periodoId } = req.params;

        const datos = await sequelize.query<{
            uid: number;
            nombre_completo: string;
            calificacion_final: number;
        }>(`
            SELECT
                u."Uid" AS uid,
                CONCAT(u.name, ' ', u."lastName") AS nombre_completo,
                ROUND(ed.calificacion_final::numeric, 2) AS calificacion_final
            FROM evaluaciones_desempeno ed
            JOIN users u ON ed.evaluado_uid = u."Uid"
            WHERE ed.periodo_id = :periodoId
              AND u."Aid" = :areaId
              AND ed.calificacion_final IS NOT NULL
            ORDER BY ed.calificacion_final DESC
        `, {
            replacements: { periodoId, areaId },
            type: QueryTypes.SELECT
        });

        const area = await Area.findByPk(areaId, { attributes: ['Aid', 'Aname'] });

        if (datos.length === 0) return res.json({ labels: [], datasets: [], area });

        // Colores según calificación (verde=alta, rojo=baja)
        const colores = datos.map(d =>
            d.calificacion_final >= 4 ? '#198754' :
            d.calificacion_final >= 3 ? '#0d6efd' :
            d.calificacion_final >= 2 ? '#ffc107' : '#dc3545'
        );

        res.json({
            area,
            labels: datos.map(d => d.nombre_completo),
            datasets: [{
                label: 'Calificación final',
                data: datos.map(d => Number(d.calificacion_final)),
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 1
            }],
            escala: { min: 0, max: 5 }
        });
    } catch (error) {
        console.error('Error gráfica comparativo área:', error);
        res.status(500).json({ msg: 'Error al generar datos de gráfica comparativa' });
    }
};

/**
 * GET /api/evaluaciones/graficas/evolucion/:uid
 * Retorna datos para Line Chart (evolución histórica del empleado)
 */
export const graficaEvolucion = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;

        const datos = await sequelize.query<{
            periodo: string;
            calificacion_final: number;
            fecha_inicio: string;
        }>(`
            SELECT
                pe.nombre AS periodo,
                ROUND(ed.calificacion_final::numeric, 2) AS calificacion_final,
                pe.fecha_inicio
            FROM evaluaciones_desempeno ed
            JOIN periodos_evaluacion pe ON ed.periodo_id = pe.id
            WHERE ed.evaluado_uid = :uid
              AND ed.calificacion_final IS NOT NULL
            ORDER BY pe.fecha_inicio ASC
        `, { replacements: { uid }, type: QueryTypes.SELECT });

        const colaborador = await User.findByPk(uid, { attributes: ['Uid', 'name', 'lastName'] });

        res.json({
            colaborador,
            labels: datos.map(d => d.periodo),
            datasets: [{
                label: 'Calificación',
                data: datos.map(d => Number(d.calificacion_final)),
                borderColor: '#1a3c6e',
                backgroundColor: 'rgba(26, 60, 110, 0.1)',
                tension: 0.3,
                fill: true
            }],
            escala: { min: 0, max: 5, suggestedMin: 1 }
        });
    } catch (error) {
        console.error('Error gráfica evolución:', error);
        res.status(500).json({ msg: 'Error al generar datos de evolución histórica' });
    }
};

/**
 * GET /api/evaluaciones/graficas/distribucion/:periodoId
 * Retorna datos para Doughnut/Pie Chart (distribución de calificaciones en el período)
 */
export const graficaDistribucion = async (req: Request, res: Response) => {
    try {
        const { periodoId } = req.params;

        const datos = await sequelize.query<{ rango: string; cantidad: number }>(`
            SELECT
                CASE
                    WHEN calificacion_final >= 4.5 THEN 'Excelente (4.5 - 5.0)'
                    WHEN calificacion_final >= 3.5 THEN 'Bueno (3.5 - 4.4)'
                    WHEN calificacion_final >= 2.5 THEN 'Aceptable (2.5 - 3.4)'
                    WHEN calificacion_final >= 1.5 THEN 'Regular (1.5 - 2.4)'
                    ELSE 'Deficiente (< 1.5)'
                END AS rango,
                COUNT(*) AS cantidad
            FROM evaluaciones_desempeno
            WHERE periodo_id = :periodoId
              AND calificacion_final IS NOT NULL
            GROUP BY rango
            ORDER BY MIN(calificacion_final) DESC
        `, { replacements: { periodoId }, type: QueryTypes.SELECT });

        res.json({
            labels: datos.map(d => d.rango),
            datasets: [{
                data: datos.map(d => Number(d.cantidad)),
                backgroundColor: ['#198754', '#0d6efd', '#ffc107', '#fd7e14', '#dc3545'],
                hoverOffset: 4
            }]
        });
    } catch (error) {
        console.error('Error gráfica distribución:', error);
        res.status(500).json({ msg: 'Error al generar datos de distribución' });
    }
};

/**
 * GET /api/evaluaciones/graficas/dashboard/:periodoId
 * KPIs del período: promedio general, mejor/peor evaluado, por área, totales
 */
export const graficaDashboard = async (req: Request, res: Response) => {
    try {
        const { periodoId } = req.params;

        const [periodo, resumenGeneral, porArea, topEmpleados] = await Promise.all([
            // Datos del período
            PeriodoEvaluacion.findByPk(periodoId),

            // KPIs generales
            sequelize.query<{
                promedio_general: number;
                calificacion_maxima: number;
                calificacion_minima: number;
                total_evaluaciones: number;
                completadas: number;
                pendientes: number;
            }>(`
                SELECT
                    ROUND(AVG(calificacion_final)::numeric, 2) AS promedio_general,
                    ROUND(MAX(calificacion_final)::numeric, 2) AS calificacion_maxima,
                    ROUND(MIN(calificacion_final)::numeric, 2) AS calificacion_minima,
                    COUNT(*) AS total_evaluaciones,
                    COUNT(*) FILTER (WHERE estado IN ('completada','aprobada')) AS completadas,
                    COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes
                FROM evaluaciones_desempeno
                WHERE periodo_id = :periodoId
            `, { replacements: { periodoId }, type: QueryTypes.SELECT }),

            // Promedio por área
            sequelize.query<{ area: string; promedio: number; cantidad: number }>(`
                SELECT
                    a."Aname" AS area,
                    ROUND(AVG(ed.calificacion_final)::numeric, 2) AS promedio,
                    COUNT(*) AS cantidad
                FROM evaluaciones_desempeno ed
                JOIN users u ON ed.evaluado_uid = u."Uid"
                JOIN areas a ON u."Aid" = a."Aid"
                WHERE ed.periodo_id = :periodoId
                  AND ed.calificacion_final IS NOT NULL
                GROUP BY a."Aid", a."Aname"
                ORDER BY promedio DESC
            `, { replacements: { periodoId }, type: QueryTypes.SELECT }),

            // Top 5 mejor y peor evaluados
            sequelize.query<{ uid: number; nombre: string; calificacion: number; area: string; cargo: string }>(`
                SELECT
                    u."Uid" AS uid,
                    CONCAT(u.name, ' ', u."lastName") AS nombre,
                    ROUND(ed.calificacion_final::numeric, 2) AS calificacion,
                    a."Aname" AS area,
                    u.cargo
                FROM evaluaciones_desempeno ed
                JOIN users u ON ed.evaluado_uid = u."Uid"
                JOIN areas a ON u."Aid" = a."Aid"
                WHERE ed.periodo_id = :periodoId AND ed.calificacion_final IS NOT NULL
                ORDER BY ed.calificacion_final DESC
                LIMIT 10
            `, { replacements: { periodoId }, type: QueryTypes.SELECT })
        ]);

        const stats: any = resumenGeneral[0] || {};

        res.json({
            periodo,
            kpis: {
                promedioGeneral: Number(stats.promedio_general) || 0,
                calificacionMaxima: Number(stats.calificacion_maxima) || 0,
                calificacionMinima: Number(stats.calificacion_minima) || 0,
                totalEvaluaciones: Number(stats.total_evaluaciones) || 0,
                completadas: Number(stats.completadas) || 0,
                pendientes: Number(stats.pendientes) || 0,
                porcentajeAvance: stats.total_evaluaciones
                    ? Math.round((Number(stats.completadas) / Number(stats.total_evaluaciones)) * 100)
                    : 0
            },
            graficaBarrasPorArea: {
                labels: porArea.map(a => a.area),
                datasets: [{
                    label: 'Promedio por área',
                    data: porArea.map(a => Number(a.promedio)),
                    backgroundColor: '#1a3c6e',
                    borderColor: '#0d2450',
                    borderWidth: 1
                }],
                cantidades: porArea.map(a => Number(a.cantidad))
            },
            topEmpleados: topEmpleados.map((e, i) => ({
                posicion: i + 1,
                uid: e.uid,
                nombre: e.nombre,
                calificacion: Number(e.calificacion),
                area: e.area,
                cargo: e.cargo
            }))
        });
    } catch (error) {
        console.error('Error gráfica dashboard:', error);
        res.status(500).json({ msg: 'Error al generar el dashboard de evaluaciones' });
    }
};
