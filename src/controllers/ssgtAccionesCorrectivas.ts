import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import fs from 'fs';
import path from 'path';
import { AccionCorrectivaInspeccion, InspeccionSSGT } from '../models/ssgt';
import { User } from '../models/user';

export const crearAccionCorrectiva = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;

        const inspeccion = await InspeccionSSGT.findByPk(data.inspeccionId);
        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        const accion = await AccionCorrectivaInspeccion.create(data);

        return res.status(201).json({ msg: 'Acción correctiva creada', accion });
    } catch (error) {
        console.error('Error al crear acción correctiva:', error);
        return res.status(500).json({ msg: 'Error al crear la acción correctiva' });
    }
};

export const obtenerAccionesCorrectivas = async (req: Request, res: Response): Promise<any> => {
    try {
        const { inspeccionId, estado, prioridad } = req.query;
        const where: any = {};

        if (inspeccionId) where.inspeccionId = inspeccionId;
        if (estado) where.estado = estado;
        if (prioridad) where.prioridad = prioridad;

        const acciones = await AccionCorrectivaInspeccion.findAll({
            where,
            include: [
                {
                    model: InspeccionSSGT,
                    as: 'inspeccion',
                    attributes: ['id', 'titulo', 'fechaInspeccion'],
                },
                {
                    model: User,
                    as: 'responsable',
                    attributes: ['Uid', 'name', 'lastName'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return res.json(acciones);
    } catch (error) {
        console.error('Error al obtener acciones correctivas:', error);
        return res.status(500).json({ msg: 'Error al obtener las acciones correctivas' });
    }
};

export const actualizarAccionCorrectiva = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const accion = await AccionCorrectivaInspeccion.findByPk(id);
        if (!accion) {
            return res.status(404).json({ msg: 'Acción correctiva no encontrada' });
        }

        const updateData = { ...req.body };
        if (updateData.estado === 'completada' && !accion.fechaCompletada) {
            updateData.fechaCompletada = new Date();
        }

        await accion.update(updateData);

        return res.json({ msg: 'Acción correctiva actualizada', accion });
    } catch (error) {
        console.error('Error al actualizar acción correctiva:', error);
        return res.status(500).json({ msg: 'Error al actualizar la acción correctiva' });
    }
};

export const eliminarAccionCorrectiva = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const accion = await AccionCorrectivaInspeccion.findByPk(id);
        if (!accion) {
            return res.status(404).json({ msg: 'Acción correctiva no encontrada' });
        }

        if (accion.evidenciaArchivo) {
            const archivoPath = path.resolve(accion.evidenciaArchivo);
            if (fs.existsSync(archivoPath)) {
                fs.unlinkSync(archivoPath);
            }
        }

        await accion.destroy();

        return res.json({ msg: 'Acción correctiva eliminada' });
    } catch (error) {
        console.error('Error al eliminar acción correctiva:', error);
        return res.status(500).json({ msg: 'Error al eliminar la acción correctiva' });
    }
};

export const subirEvidenciaAccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No se ha subido ningún archivo' });
        }

        const accion = await AccionCorrectivaInspeccion.findByPk(id);
        if (!accion) {
            return res.status(404).json({ msg: 'Acción correctiva no encontrada' });
        }

        await accion.update({ evidenciaArchivo: file.path });

        return res.json({ msg: 'Evidencia subida correctamente', evidencia: file.path });
    } catch (error) {
        console.error('Error al subir evidencia:', error);
        return res.status(500).json({ msg: 'Error al subir la evidencia' });
    }
};
