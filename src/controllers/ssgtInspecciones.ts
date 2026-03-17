import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import fs from 'fs';
import path from 'path';
import {
    InspeccionSSGT,
    PlantillaInspeccion,
    SeccionPlantilla,
    PreguntaPlantilla,
    RespuestaInspeccion,
    AccionCorrectivaInspeccion,
    CondicionInsegura,
} from '../models/ssgt';
import { User } from '../models/user';

// ===================== INSPECCIONES (SafetyCulture) =====================

export const crearInspeccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const { plantillaId, titulo, tipo, fechaInspeccion, lugar, empresa, observacionesGenerales } = req.body;

        const data: any = {
            titulo,
            tipo: tipo || 'plantilla',
            fechaInspeccion,
            lugar,
            empresa,
            observacionesGenerales,
            inspectorId: (req as any).userId,
        };

        if (plantillaId) {
            const plantilla = await PlantillaInspeccion.findByPk(plantillaId, {
                include: [{
                    model: SeccionPlantilla,
                    as: 'secciones',
                    include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                }],
            });

            if (!plantilla) {
                return res.status(404).json({ msg: 'Plantilla no encontrada' });
            }

            data.plantillaId = plantillaId;
            data.titulo = titulo || plantilla.titulo;
            data.puntajeMaximo = plantilla.puntajeMaximo;
        }

        const inspeccion = await InspeccionSSGT.create(data);

        // Crear respuestas vacías basadas en la plantilla
        if (plantillaId) {
            const plantilla = await PlantillaInspeccion.findByPk(plantillaId, {
                include: [{
                    model: SeccionPlantilla,
                    as: 'secciones',
                    include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                }],
            });

            const secciones = (plantilla as any)?.secciones || [];
            for (const seccion of secciones) {
                const preguntas = seccion.preguntas || [];
                for (const pregunta of preguntas) {
                    await RespuestaInspeccion.create({
                        inspeccionId: inspeccion.id,
                        preguntaId: pregunta.id,
                        seccionId: seccion.id,
                        orden: pregunta.orden,
                        puntos: 0,
                    });
                }
            }
        }

        return res.status(201).json({ msg: 'Inspección creada correctamente', inspeccion });
    } catch (error) {
        console.error('Error al crear inspección:', error);
        return res.status(500).json({ msg: 'Error al crear la inspección' });
    }
};

export const obtenerInspecciones = async (req: Request, res: Response): Promise<any> => {
    try {
        const { estado, empresa, tipo } = req.query;
        const where: any = {};

        if (estado) where.estado = estado;
        if (empresa) where.empresa = empresa;
        if (tipo) where.tipo = tipo;

        const inspecciones = await InspeccionSSGT.findAll({
            where,
            include: [
                {
                    model: PlantillaInspeccion,
                    as: 'plantilla',
                    attributes: ['id', 'titulo', 'categoria'],
                },
                {
                    model: RespuestaInspeccion,
                    as: 'respuestas',
                    include: [{
                        model: PreguntaPlantilla,
                        as: 'pregunta',
                    }],
                },
                {
                    model: AccionCorrectivaInspeccion,
                    as: 'acciones',
                },
                {
                    model: CondicionInsegura,
                    as: 'condiciones',
                },
                {
                    model: User,
                    as: 'inspector',
                    attributes: ['Uid', 'name', 'lastName'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return res.json(inspecciones);
    } catch (error) {
        console.error('Error al obtener inspecciones:', error);
        return res.status(500).json({ msg: 'Error al obtener las inspecciones' });
    }
};

export const obtenerInspeccionPorId = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const inspeccion = await InspeccionSSGT.findByPk(id, {
            include: [
                {
                    model: PlantillaInspeccion,
                    as: 'plantilla',
                    include: [{
                        model: SeccionPlantilla,
                        as: 'secciones',
                        include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                    }],
                },
                {
                    model: RespuestaInspeccion,
                    as: 'respuestas',
                    include: [
                        { model: PreguntaPlantilla, as: 'pregunta' },
                        { model: SeccionPlantilla, as: 'seccion' },
                    ],
                },
                {
                    model: AccionCorrectivaInspeccion,
                    as: 'acciones',
                    include: [{
                        model: User,
                        as: 'responsable',
                        attributes: ['Uid', 'name', 'lastName'],
                    }],
                },
                {
                    model: CondicionInsegura,
                    as: 'condiciones',
                },
                {
                    model: User,
                    as: 'inspector',
                    attributes: ['Uid', 'name', 'lastName'],
                },
            ],
        });

        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        return res.json(inspeccion);
    } catch (error) {
        console.error('Error al obtener inspección:', error);
        return res.status(500).json({ msg: 'Error al obtener la inspección' });
    }
};

export const actualizarInspeccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const inspeccion = await InspeccionSSGT.findByPk(id);
        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        await inspeccion.update(req.body);

        return res.json({ msg: 'Inspección actualizada correctamente', inspeccion });
    } catch (error) {
        console.error('Error al actualizar inspección:', error);
        return res.status(500).json({ msg: 'Error al actualizar la inspección' });
    }
};

export const eliminarInspeccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const inspeccion = await InspeccionSSGT.findByPk(id);
        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        await AccionCorrectivaInspeccion.destroy({ where: { inspeccionId: id } });
        await RespuestaInspeccion.destroy({ where: { inspeccionId: id } });
        await CondicionInsegura.destroy({ where: { inspeccionId: id } });
        await inspeccion.destroy();

        return res.json({ msg: 'Inspección eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar inspección:', error);
        return res.status(500).json({ msg: 'Error al eliminar la inspección' });
    }
};

// Guardar respuestas y calcular puntaje
export const guardarRespuestas = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { respuestas } = req.body;

        const inspeccion = await InspeccionSSGT.findByPk(id, {
            include: [{
                model: PlantillaInspeccion,
                as: 'plantilla',
                include: [{
                    model: SeccionPlantilla,
                    as: 'secciones',
                    include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                }],
            }],
        });

        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        let puntajeObtenido = 0;
        let puntajeMaximo = 0;

        for (const resp of respuestas) {
            const respuestaExistente = await RespuestaInspeccion.findOne({
                where: { inspeccionId: id, preguntaId: resp.preguntaId },
            });

            // Calcular puntos
            const pregunta = await PreguntaPlantilla.findByPk(resp.preguntaId, {
                include: [{ model: SeccionPlantilla, as: 'seccion' }],
            });

            let puntos = 0;
            if (pregunta) {
                const seccion = (pregunta as any).seccion;
                const pesoSeccion = seccion?.peso || 1.0;
                const pesoPregunta = pregunta.peso || 1.0;
                const maxPuntos = pesoSeccion * pesoPregunta;
                puntajeMaximo += maxPuntos;

                // Evaluar si la respuesta es conforme
                if (pregunta.tipo === 'si_no') {
                    if (pregunta.respuestaEsperada && resp.valor === pregunta.respuestaEsperada) {
                        puntos = maxPuntos;
                    } else if (!pregunta.respuestaEsperada && resp.valor === 'si') {
                        puntos = maxPuntos;
                    }
                } else if (pregunta.tipo === 'slider' || pregunta.tipo === 'numero') {
                    const valorNum = parseFloat(resp.valor);
                    if (!isNaN(valorNum)) {
                        puntos = (valorNum / 100) * maxPuntos;
                    }
                } else {
                    // texto, fecha, foto, firma: si hay valor = conforme
                    if (resp.valor) puntos = maxPuntos;
                }

                puntajeObtenido += puntos;
            }

            if (respuestaExistente) {
                await respuestaExistente.update({
                    valor: resp.valor,
                    valorArchivo: resp.valorArchivo || null,
                    observacion: resp.observacion || null,
                    puntos,
                });
            } else {
                await RespuestaInspeccion.create({
                    inspeccionId: id,
                    preguntaId: resp.preguntaId,
                    seccionId: resp.seccionId,
                    valor: resp.valor,
                    valorArchivo: resp.valorArchivo || null,
                    observacion: resp.observacion || null,
                    puntos,
                    orden: resp.orden || 0,
                });
            }
        }

        const porcentaje = puntajeMaximo > 0 ? (puntajeObtenido / puntajeMaximo) * 100 : 0;
        const plantilla = (inspeccion as any).plantilla;
        const umbral = plantilla?.umbralAprobacion || 80;
        const aprobada = porcentaje >= umbral;

        await inspeccion.update({
            puntajeObtenido,
            puntajeMaximo,
            porcentaje: Math.round(porcentaje * 100) / 100,
            aprobada,
        });

        return res.json({
            msg: 'Respuestas guardadas correctamente',
            puntajeObtenido,
            puntajeMaximo,
            porcentaje: Math.round(porcentaje * 100) / 100,
            aprobada,
        });
    } catch (error) {
        console.error('Error al guardar respuestas:', error);
        return res.status(500).json({ msg: 'Error al guardar las respuestas' });
    }
};

// Completar inspección
export const completarInspeccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const inspeccion = await InspeccionSSGT.findByPk(id);
        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        await inspeccion.update({ estado: 'completada' });

        return res.json({ msg: 'Inspección completada', inspeccion });
    } catch (error) {
        console.error('Error al completar inspección:', error);
        return res.status(500).json({ msg: 'Error al completar la inspección' });
    }
};

// ===================== CONDICIONES INSEGURAS =====================

export const crearCondicionInsegura = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;
        data.reportadoPor = (req as any).userId;

        const condicion = await CondicionInsegura.create(data);

        return res.status(201).json({ msg: 'Condición insegura creada correctamente', condicion });
    } catch (error) {
        console.error('Error al crear condición insegura:', error);
        return res.status(500).json({ msg: 'Error al crear la condición insegura' });
    }
};

export const obtenerCondicionesInseguras = async (req: Request, res: Response): Promise<any> => {
    try {
        const { estado, severidad } = req.query;
        const where: any = {};

        if (estado) where.estado = estado;
        if (severidad) where.severidad = severidad;

        const condiciones = await CondicionInsegura.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'reportante',
                    attributes: ['Uid', 'name', 'lastName'],
                },
                {
                    model: InspeccionSSGT,
                    as: 'inspeccion',
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return res.json(condiciones);
    } catch (error) {
        console.error('Error al obtener condiciones inseguras:', error);
        return res.status(500).json({ msg: 'Error al obtener las condiciones inseguras' });
    }
};

export const actualizarCondicionInsegura = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const condicion = await CondicionInsegura.findByPk(id);
        if (!condicion) {
            return res.status(404).json({ msg: 'Condición insegura no encontrada' });
        }

        await condicion.update(req.body);

        return res.json({ msg: 'Condición insegura actualizada correctamente', condicion });
    } catch (error) {
        console.error('Error al actualizar condición insegura:', error);
        return res.status(500).json({ msg: 'Error al actualizar la condición insegura' });
    }
};

export const eliminarCondicionInsegura = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const condicion = await CondicionInsegura.findByPk(id);
        if (!condicion) {
            return res.status(404).json({ msg: 'Condición insegura no encontrada' });
        }

        const foto = (condicion as any).foto;
        if (foto) {
            const fotoPath = path.resolve(foto);
            if (fs.existsSync(fotoPath)) {
                fs.unlinkSync(fotoPath);
            }
        }

        await condicion.destroy();

        return res.json({ msg: 'Condición insegura eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar condición insegura:', error);
        return res.status(500).json({ msg: 'Error al eliminar la condición insegura' });
    }
};

export const subirFotoCondicion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No se ha subido ninguna foto' });
        }

        const condicion = await CondicionInsegura.findByPk(id);
        if (!condicion) {
            return res.status(404).json({ msg: 'Condición insegura no encontrada' });
        }

        await condicion.update({ foto: file.path });

        return res.json({ msg: 'Foto subida correctamente', foto: file.path });
    } catch (error) {
        console.error('Error al subir foto de condición:', error);
        return res.status(500).json({ msg: 'Error al subir la foto' });
    }
};
