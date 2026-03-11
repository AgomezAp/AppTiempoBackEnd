import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import { CapacitacionSST, EvaluacionCapacitacion, PreguntaEvaluacion, RespuestaEvaluacion } from '../models/ssgt';
import { User } from '../models/user';

export const crearCapacitacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;

        const capacitacion = await CapacitacionSST.create(data);

        return res.status(201).json({ msg: 'Capacitación creada correctamente', capacitacion });
    } catch (error) {
        console.error('Error al crear capacitación:', error);
        return res.status(500).json({ msg: 'Error al crear la capacitación' });
    }
};

export const obtenerCapacitaciones = async (req: Request, res: Response): Promise<any> => {
    try {
        const { estado, empresa, tema } = req.query;
        const where: any = {};

        if (estado) where.estado = estado;
        if (empresa) where.empresa = empresa;
        if (tema) where.tema = tema;

        const capacitaciones = await CapacitacionSST.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'instructor',
                    attributes: ['Uid', 'name', 'lastName']
                },
                {
                    model: EvaluacionCapacitacion,
                    as: 'evaluacion'
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(capacitaciones);
    } catch (error) {
        console.error('Error al obtener capacitaciones:', error);
        return res.status(500).json({ msg: 'Error al obtener las capacitaciones' });
    }
};

export const actualizarCapacitacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const capacitacion = await CapacitacionSST.findByPk(id);
        if (!capacitacion) {
            return res.status(404).json({ msg: 'Capacitación no encontrada' });
        }

        await capacitacion.update(req.body);

        return res.json({ msg: 'Capacitación actualizada correctamente', capacitacion });
    } catch (error) {
        console.error('Error al actualizar capacitación:', error);
        return res.status(500).json({ msg: 'Error al actualizar la capacitación' });
    }
};

export const eliminarCapacitacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const capacitacion = await CapacitacionSST.findByPk(id);
        if (!capacitacion) {
            return res.status(404).json({ msg: 'Capacitación no encontrada' });
        }

        const evaluacion = await EvaluacionCapacitacion.findOne({ where: { capacitacionId: id } });
        if (evaluacion) {
            const evaluacionId = (evaluacion as any).id;
            const preguntas = await PreguntaEvaluacion.findAll({ where: { evaluacionId } });
            const preguntaIds = preguntas.map((p: any) => p.id);

            if (preguntaIds.length > 0) {
                await RespuestaEvaluacion.destroy({ where: { preguntaId: preguntaIds } });
            }
            await PreguntaEvaluacion.destroy({ where: { evaluacionId } });
            await evaluacion.destroy();
        }

        const materialArchivo = (capacitacion as any).materialArchivo;
        if (materialArchivo) {
            const fs = require('fs');
            const path = require('path');
            const materialPath = path.resolve(materialArchivo);
            if (fs.existsSync(materialPath)) {
                fs.unlinkSync(materialPath);
            }
        }

        await capacitacion.destroy();

        return res.json({ msg: 'Capacitación eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar capacitación:', error);
        return res.status(500).json({ msg: 'Error al eliminar la capacitación' });
    }
};

export const subirMaterial = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No se ha subido ningún archivo' });
        }

        const capacitacion = await CapacitacionSST.findByPk(id);
        if (!capacitacion) {
            return res.status(404).json({ msg: 'Capacitación no encontrada' });
        }

        await capacitacion.update({ materialArchivo: file.path });

        return res.json({ msg: 'Material subido correctamente', material: file.path });
    } catch (error) {
        console.error('Error al subir material:', error);
        return res.status(500).json({ msg: 'Error al subir el material' });
    }
};

export const crearEvaluacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { titulo, tiempoLimite, preguntas } = req.body;

        const capacitacion = await CapacitacionSST.findByPk(id);
        if (!capacitacion) {
            return res.status(404).json({ msg: 'Capacitación no encontrada' });
        }

        const evaluacionExistente = await EvaluacionCapacitacion.findOne({ where: { capacitacionId: id } });
        if (evaluacionExistente) {
            return res.status(400).json({ msg: 'Ya existe una evaluación para esta capacitación' });
        }

        const evaluacion = await EvaluacionCapacitacion.create({
            capacitacionId: id,
            titulo,
            tiempoLimite: tiempoLimite || null
        });

        const preguntasCrear = preguntas.map((p: any) => ({
            evaluacionId: (evaluacion as any).id,
            pregunta: p.pregunta,
            tipo: p.tipo,
            opciones: p.opciones,
            respuestaCorrecta: p.respuestaCorrecta,
            orden: p.orden
        }));

        const preguntasCreadas = await PreguntaEvaluacion.bulkCreate(preguntasCrear);

        return res.status(201).json({
            msg: 'Evaluación creada correctamente',
            evaluacion,
            preguntas: preguntasCreadas
        });
    } catch (error) {
        console.error('Error al crear evaluación:', error);
        return res.status(500).json({ msg: 'Error al crear la evaluación' });
    }
};

export const obtenerEvaluacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const evaluacion = await EvaluacionCapacitacion.findOne({
            where: { capacitacionId: id },
            include: [
                {
                    model: PreguntaEvaluacion,
                    as: 'preguntas',
                    order: [['orden', 'ASC']]
                },
                {
                    model: RespuestaEvaluacion,
                    as: 'respuestas',
                    include: [
                        {
                            model: User,
                            as: 'usuario',
                            attributes: ['Uid', 'name', 'lastName']
                        }
                    ]
                }
            ],
            order: [
                [{ model: PreguntaEvaluacion, as: 'preguntas' }, 'orden', 'ASC']
            ]
        });

        if (!evaluacion) {
            return res.status(404).json({ msg: 'Evaluación no encontrada' });
        }

        return res.json(evaluacion);
    } catch (error) {
        console.error('Error al obtener evaluación:', error);
        return res.status(500).json({ msg: 'Error al obtener la evaluación' });
    }
};

export const responderEvaluacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { respuestas } = req.body;
        const userId = req.body.userId;

        const evaluacion = await EvaluacionCapacitacion.findOne({
            where: { capacitacionId: id },
            include: [
                {
                    model: PreguntaEvaluacion,
                    as: 'preguntas'
                }
            ]
        });

        if (!evaluacion) {
            return res.status(404).json({ msg: 'Evaluación no encontrada' });
        }

        const preguntas = (evaluacion as any).preguntas;
        const totalPreguntas = preguntas.length;
        let correctas = 0;

        const respuestasCrear: any[] = [];

        for (const pregunta of preguntas) {
            const respuestaUsuario = respuestas[pregunta.id];
            const esCorrecta = respuestaUsuario !== undefined &&
                String(respuestaUsuario).trim().toLowerCase() === String(pregunta.respuestaCorrecta).trim().toLowerCase();

            if (esCorrecta) {
                correctas++;
            }

            respuestasCrear.push({
                evaluacionId: (evaluacion as any).id,
                preguntaId: pregunta.id,
                usuarioId: userId,
                respuesta: respuestaUsuario !== undefined ? String(respuestaUsuario) : '',
                esCorrecta,
                calificacion: esCorrecta ? 100 : 0
            });
        }

        const calificacionFinal = totalPreguntas > 0 ? (correctas / totalPreguntas) * 100 : 0;

        for (const resp of respuestasCrear) {
            resp.calificacion = calificacionFinal;
        }

        const respuestasCreadas = await RespuestaEvaluacion.bulkCreate(respuestasCrear);

        return res.status(201).json({
            msg: 'Evaluación respondida correctamente',
            calificacion: calificacionFinal,
            correctas,
            totalPreguntas,
            respuestas: respuestasCreadas
        });
    } catch (error) {
        console.error('Error al responder evaluación:', error);
        return res.status(500).json({ msg: 'Error al responder la evaluación' });
    }
};

export const obtenerResultados = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const evaluacion = await EvaluacionCapacitacion.findOne({
            where: { capacitacionId: id }
        });

        if (!evaluacion) {
            return res.status(404).json({ msg: 'Evaluación no encontrada' });
        }

        const respuestas = await RespuestaEvaluacion.findAll({
            where: { evaluacionId: (evaluacion as any).id },
            include: [
                {
                    model: User,
                    as: 'usuario',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ],
            order: [['calificacion', 'DESC']]
        });

        return res.json(respuestas);
    } catch (error) {
        console.error('Error al obtener resultados:', error);
        return res.status(500).json({ msg: 'Error al obtener los resultados' });
    }
};
