import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import { PlantillaInspeccion, SeccionPlantilla, PreguntaPlantilla } from '../models/ssgt';
import { User } from '../models/user';

// ===================== PLANTILLAS =====================

export const crearPlantilla = async (req: Request, res: Response): Promise<any> => {
    try {
        const { titulo, descripcion, categoria, empresa, umbralAprobacion, secciones } = req.body;

        const plantilla = await PlantillaInspeccion.create({
            titulo,
            descripcion,
            categoria,
            empresa,
            creadorId: (req as any).userId,
            umbralAprobacion: umbralAprobacion || 80,
        });

        let puntajeMaximo = 0;

        if (secciones && secciones.length > 0) {
            for (const seccionData of secciones) {
                const seccion = await SeccionPlantilla.create({
                    plantillaId: plantilla.id,
                    titulo: seccionData.titulo,
                    descripcion: seccionData.descripcion,
                    orden: seccionData.orden || 0,
                    peso: seccionData.peso || 1.0,
                });

                if (seccionData.preguntas && seccionData.preguntas.length > 0) {
                    for (const preguntaData of seccionData.preguntas) {
                        await PreguntaPlantilla.create({
                            seccionId: seccion.id,
                            texto: preguntaData.texto,
                            tipo: preguntaData.tipo || 'si_no',
                            opciones: preguntaData.opciones ? JSON.stringify(preguntaData.opciones) : null,
                            requerida: preguntaData.requerida !== false,
                            peso: preguntaData.peso || 1.0,
                            respuestaEsperada: preguntaData.respuestaEsperada || null,
                            orden: preguntaData.orden || 0,
                            requiereAccionSiNoConforme: preguntaData.requiereAccionSiNoConforme || false,
                        });
                        puntajeMaximo += (preguntaData.peso || 1.0) * (seccionData.peso || 1.0);
                    }
                }
            }
        }

        await plantilla.update({ puntajeMaximo });

        const plantillaCompleta = await PlantillaInspeccion.findByPk(plantilla.id, {
            include: [{
                model: SeccionPlantilla,
                as: 'secciones',
                include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                order: [['orden', 'ASC']],
            }],
        });

        return res.status(201).json({ msg: 'Plantilla creada correctamente', plantilla: plantillaCompleta });
    } catch (error) {
        console.error('Error al crear plantilla:', error);
        return res.status(500).json({ msg: 'Error al crear la plantilla' });
    }
};

export const obtenerPlantillas = async (req: Request, res: Response): Promise<any> => {
    try {
        const { empresa, estado, categoria } = req.query;
        const where: any = {};

        if (empresa) where.empresa = empresa;
        if (estado) where.estado = estado;
        if (categoria) where.categoria = categoria;

        const plantillas = await PlantillaInspeccion.findAll({
            where,
            include: [
                {
                    model: SeccionPlantilla,
                    as: 'secciones',
                    include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                },
                {
                    model: User,
                    as: 'creador',
                    attributes: ['Uid', 'name', 'lastName'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return res.json(plantillas);
    } catch (error) {
        console.error('Error al obtener plantillas:', error);
        return res.status(500).json({ msg: 'Error al obtener las plantillas' });
    }
};

export const obtenerPlantillaPorId = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const plantilla = await PlantillaInspeccion.findByPk(id, {
            include: [
                {
                    model: SeccionPlantilla,
                    as: 'secciones',
                    include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
                },
                {
                    model: User,
                    as: 'creador',
                    attributes: ['Uid', 'name', 'lastName'],
                },
            ],
        });

        if (!plantilla) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        return res.json(plantilla);
    } catch (error) {
        console.error('Error al obtener plantilla:', error);
        return res.status(500).json({ msg: 'Error al obtener la plantilla' });
    }
};

export const actualizarPlantilla = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { titulo, descripcion, categoria, empresa, umbralAprobacion, estado, secciones } = req.body;

        const plantilla = await PlantillaInspeccion.findByPk(id);
        if (!plantilla) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        await plantilla.update({ titulo, descripcion, categoria, empresa, umbralAprobacion, estado });

        if (secciones) {
            // Eliminar secciones y preguntas existentes
            const seccionesExistentes = await SeccionPlantilla.findAll({ where: { plantillaId: id } });
            for (const sec of seccionesExistentes) {
                await PreguntaPlantilla.destroy({ where: { seccionId: sec.id } });
            }
            await SeccionPlantilla.destroy({ where: { plantillaId: id } });

            let puntajeMaximo = 0;

            for (const seccionData of secciones) {
                const seccion = await SeccionPlantilla.create({
                    plantillaId: id,
                    titulo: seccionData.titulo,
                    descripcion: seccionData.descripcion,
                    orden: seccionData.orden || 0,
                    peso: seccionData.peso || 1.0,
                });

                if (seccionData.preguntas && seccionData.preguntas.length > 0) {
                    for (const preguntaData of seccionData.preguntas) {
                        await PreguntaPlantilla.create({
                            seccionId: seccion.id,
                            texto: preguntaData.texto,
                            tipo: preguntaData.tipo || 'si_no',
                            opciones: preguntaData.opciones ? JSON.stringify(preguntaData.opciones) : null,
                            requerida: preguntaData.requerida !== false,
                            peso: preguntaData.peso || 1.0,
                            respuestaEsperada: preguntaData.respuestaEsperada || null,
                            orden: preguntaData.orden || 0,
                            requiereAccionSiNoConforme: preguntaData.requiereAccionSiNoConforme || false,
                        });
                        puntajeMaximo += (preguntaData.peso || 1.0) * (seccionData.peso || 1.0);
                    }
                }
            }

            await plantilla.update({ puntajeMaximo });
        }

        const plantillaCompleta = await PlantillaInspeccion.findByPk(id, {
            include: [{
                model: SeccionPlantilla,
                as: 'secciones',
                include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
            }],
        });

        return res.json({ msg: 'Plantilla actualizada correctamente', plantilla: plantillaCompleta });
    } catch (error) {
        console.error('Error al actualizar plantilla:', error);
        return res.status(500).json({ msg: 'Error al actualizar la plantilla' });
    }
};

export const eliminarPlantilla = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const plantilla = await PlantillaInspeccion.findByPk(id);
        if (!plantilla) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        const seccionesExistentes = await SeccionPlantilla.findAll({ where: { plantillaId: id } });
        for (const sec of seccionesExistentes) {
            await PreguntaPlantilla.destroy({ where: { seccionId: sec.id } });
        }
        await SeccionPlantilla.destroy({ where: { plantillaId: id } });
        await plantilla.destroy();

        return res.json({ msg: 'Plantilla eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar plantilla:', error);
        return res.status(500).json({ msg: 'Error al eliminar la plantilla' });
    }
};

export const duplicarPlantilla = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const original = await PlantillaInspeccion.findByPk(id, {
            include: [{
                model: SeccionPlantilla,
                as: 'secciones',
                include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
            }],
        });

        if (!original) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        const nuevaPlantilla = await PlantillaInspeccion.create({
            titulo: `${original.titulo} (copia)`,
            descripcion: original.descripcion,
            categoria: original.categoria,
            empresa: original.empresa,
            creadorId: (req as any).userId,
            puntajeMaximo: original.puntajeMaximo,
            umbralAprobacion: original.umbralAprobacion,
        });

        const secciones = (original as any).secciones || [];
        for (const sec of secciones) {
            const nuevaSeccion = await SeccionPlantilla.create({
                plantillaId: nuevaPlantilla.id,
                titulo: sec.titulo,
                descripcion: sec.descripcion,
                orden: sec.orden,
                peso: sec.peso,
            });

            const preguntas = sec.preguntas || [];
            for (const preg of preguntas) {
                await PreguntaPlantilla.create({
                    seccionId: nuevaSeccion.id,
                    texto: preg.texto,
                    tipo: preg.tipo,
                    opciones: preg.opciones,
                    requerida: preg.requerida,
                    peso: preg.peso,
                    respuestaEsperada: preg.respuestaEsperada,
                    orden: preg.orden,
                    requiereAccionSiNoConforme: preg.requiereAccionSiNoConforme,
                });
            }
        }

        const plantillaCompleta = await PlantillaInspeccion.findByPk(nuevaPlantilla.id, {
            include: [{
                model: SeccionPlantilla,
                as: 'secciones',
                include: [{ model: PreguntaPlantilla, as: 'preguntas' }],
            }],
        });

        return res.status(201).json({ msg: 'Plantilla duplicada correctamente', plantilla: plantillaCompleta });
    } catch (error) {
        console.error('Error al duplicar plantilla:', error);
        return res.status(500).json({ msg: 'Error al duplicar la plantilla' });
    }
};
