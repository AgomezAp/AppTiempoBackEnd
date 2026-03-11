import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import fs from 'fs';
import path from 'path';
import { InspeccionSSGT, ChecklistItemSSGT, CondicionInsegura, MatrizRiesgo, PlanAccion } from '../models/ssgt';
import { User } from '../models/user';

// ===================== INSPECCIONES =====================

export const crearInspeccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;
        data.inspectorId = req.body.userId;

        const inspeccion = await InspeccionSSGT.create(data);

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
                    model: ChecklistItemSSGT,
                    as: 'checklist'
                },
                {
                    model: CondicionInsegura,
                    as: 'condiciones'
                },
                {
                    model: User,
                    as: 'inspector',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(inspecciones);
    } catch (error) {
        console.error('Error al obtener inspecciones:', error);
        return res.status(500).json({ msg: 'Error al obtener las inspecciones' });
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

        await ChecklistItemSSGT.destroy({ where: { inspeccionId: id } });
        await CondicionInsegura.destroy({ where: { inspeccionId: id } });
        await inspeccion.destroy();

        return res.json({ msg: 'Inspección eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar inspección:', error);
        return res.status(500).json({ msg: 'Error al eliminar la inspección' });
    }
};

export const guardarChecklist = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { items } = req.body;

        const inspeccion = await InspeccionSSGT.findByPk(id);
        if (!inspeccion) {
            return res.status(404).json({ msg: 'Inspección no encontrada' });
        }

        await ChecklistItemSSGT.destroy({ where: { inspeccionId: id } });

        const checklistItems = items.map((item: any) => ({
            inspeccionId: id,
            pregunta: item.pregunta,
            cumple: item.cumple,
            observacion: item.observacion,
            orden: item.orden
        }));

        const creados = await ChecklistItemSSGT.bulkCreate(checklistItems);

        return res.json({ msg: 'Checklist guardado correctamente', checklist: creados });
    } catch (error) {
        console.error('Error al guardar checklist:', error);
        return res.status(500).json({ msg: 'Error al guardar el checklist' });
    }
};

// ===================== CONDICIONES INSEGURAS =====================

export const crearCondicionInsegura = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;
        data.reportadoPor = req.body.userId;

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
                    attributes: ['Uid', 'name', 'lastName']
                },
                {
                    model: InspeccionSSGT,
                    as: 'inspeccion'
                }
            ],
            order: [['createdAt', 'DESC']]
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

// ===================== MATRIZ DE RIESGOS =====================

const calcularNivelRiesgo = (probabilidad: number, consecuencia: number): string => {
    const valor = probabilidad * consecuencia;
    if (valor >= 21) return 'critico';
    if (valor >= 16) return 'muy_alto';
    if (valor >= 10) return 'alto';
    if (valor >= 5) return 'medio';
    return 'bajo';
};

export const crearRiesgo = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;
        data.responsableId = req.body.responsableId;
        data.nivelRiesgo = calcularNivelRiesgo(data.probabilidad, data.consecuencia);

        const riesgo = await MatrizRiesgo.create(data);

        return res.status(201).json({ msg: 'Riesgo creado correctamente', riesgo });
    } catch (error) {
        console.error('Error al crear riesgo:', error);
        return res.status(500).json({ msg: 'Error al crear el riesgo' });
    }
};

export const obtenerRiesgos = async (req: Request, res: Response): Promise<any> => {
    try {
        const { empresa, nivelRiesgo } = req.query;
        const where: any = {};

        if (empresa) where.empresa = empresa;
        if (nivelRiesgo) where.nivelRiesgo = nivelRiesgo;

        const riesgos = await MatrizRiesgo.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'responsable',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(riesgos);
    } catch (error) {
        console.error('Error al obtener riesgos:', error);
        return res.status(500).json({ msg: 'Error al obtener los riesgos' });
    }
};

export const actualizarRiesgo = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const riesgo = await MatrizRiesgo.findByPk(id);
        if (!riesgo) {
            return res.status(404).json({ msg: 'Riesgo no encontrado' });
        }

        const data = req.body;
        const probabilidad = data.probabilidad !== undefined ? data.probabilidad : (riesgo as any).probabilidad;
        const consecuencia = data.consecuencia !== undefined ? data.consecuencia : (riesgo as any).consecuencia;
        data.nivelRiesgo = calcularNivelRiesgo(probabilidad, consecuencia);

        await riesgo.update(data);

        return res.json({ msg: 'Riesgo actualizado correctamente', riesgo });
    } catch (error) {
        console.error('Error al actualizar riesgo:', error);
        return res.status(500).json({ msg: 'Error al actualizar el riesgo' });
    }
};

export const eliminarRiesgo = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const riesgo = await MatrizRiesgo.findByPk(id);
        if (!riesgo) {
            return res.status(404).json({ msg: 'Riesgo no encontrado' });
        }

        const archivo = (riesgo as any).archivoAdjunto;
        if (archivo) {
            const archivoPath = path.resolve(archivo);
            if (fs.existsSync(archivoPath)) {
                fs.unlinkSync(archivoPath);
            }
        }

        await riesgo.destroy();

        return res.json({ msg: 'Riesgo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar riesgo:', error);
        return res.status(500).json({ msg: 'Error al eliminar el riesgo' });
    }
};

export const subirArchivoRiesgo = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No se ha subido ningún archivo' });
        }

        const riesgo = await MatrizRiesgo.findByPk(id);
        if (!riesgo) {
            return res.status(404).json({ msg: 'Riesgo no encontrado' });
        }

        await riesgo.update({ archivoAdjunto: file.path });

        return res.json({ msg: 'Archivo subido correctamente', archivo: file.path });
    } catch (error) {
        console.error('Error al subir archivo de riesgo:', error);
        return res.status(500).json({ msg: 'Error al subir el archivo' });
    }
};

// ===================== PLANES DE ACCION =====================

export const crearPlanAccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const data = req.body;
        data.responsableId = req.body.responsableId;

        const plan = await PlanAccion.create(data);

        return res.status(201).json({ msg: 'Plan de acción creado correctamente', plan });
    } catch (error) {
        console.error('Error al crear plan de acción:', error);
        return res.status(500).json({ msg: 'Error al crear el plan de acción' });
    }
};

export const obtenerPlanesAccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const { estado, origen } = req.query;
        const where: any = {};

        if (estado) where.estado = estado;
        if (origen) where.origen = origen;

        const planes = await PlanAccion.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'responsablePlan',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(planes);
    } catch (error) {
        console.error('Error al obtener planes de acción:', error);
        return res.status(500).json({ msg: 'Error al obtener los planes de acción' });
    }
};

export const actualizarPlanAccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const plan = await PlanAccion.findByPk(id);
        if (!plan) {
            return res.status(404).json({ msg: 'Plan de acción no encontrado' });
        }

        await plan.update(req.body);

        return res.json({ msg: 'Plan de acción actualizado correctamente', plan });
    } catch (error) {
        console.error('Error al actualizar plan de acción:', error);
        return res.status(500).json({ msg: 'Error al actualizar el plan de acción' });
    }
};

export const eliminarPlanAccion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const plan = await PlanAccion.findByPk(id);
        if (!plan) {
            return res.status(404).json({ msg: 'Plan de acción no encontrado' });
        }

        const evidencia = (plan as any).evidencia;
        if (evidencia) {
            const evidenciaPath = path.resolve(evidencia);
            if (fs.existsSync(evidenciaPath)) {
                fs.unlinkSync(evidenciaPath);
            }
        }

        await plan.destroy();

        return res.json({ msg: 'Plan de acción eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar plan de acción:', error);
        return res.status(500).json({ msg: 'Error al eliminar el plan de acción' });
    }
};
