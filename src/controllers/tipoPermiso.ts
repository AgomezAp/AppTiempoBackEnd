import { Request, Response } from 'express';
import { TipoPermiso } from '../models/tipoPermiso';

export const getTiposPermiso = async (req: Request, res: Response): Promise<any> => {
  try {
    const tipos = await TipoPermiso.findAll({
      where: { activo: true },
      order: [['orden', 'ASC'], ['nombre', 'ASC']],
    });
    return res.status(200).json(tipos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener tipos de permiso', error });
  }
};

export const getTiposPermisoAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const tipos = await TipoPermiso.findAll({
      order: [['orden', 'ASC'], ['nombre', 'ASC']],
    });
    return res.status(200).json(tipos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener tipos de permiso', error });
  }
};

export const createTipoPermiso = async (req: Request, res: Response): Promise<any> => {
  const { nombre, descripcion, requiere_horas, requiere_soporte, requiere_fecha_fin,
    minimo_dias_general, minimo_dias_gestion_admin, es_para_cc_filtrado, orden } = req.body;

  if (!nombre) {
    return res.status(400).json({ msg: 'El nombre del tipo de permiso es obligatorio' });
  }

  try {
    const maxOrden = await TipoPermiso.max<number, TipoPermiso>('orden') || 0;
    const tipo = await TipoPermiso.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      requiere_horas: requiere_horas ?? false,
      requiere_soporte: requiere_soporte ?? false,
      requiere_fecha_fin: requiere_fecha_fin ?? false,
      minimo_dias_general: minimo_dias_general || null,
      minimo_dias_gestion_admin: minimo_dias_gestion_admin || null,
      es_para_cc_filtrado: es_para_cc_filtrado ?? false,
      activo: true,
      orden: orden ?? (maxOrden + 1),
    });
    return res.status(201).json(tipo);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ msg: 'Ya existe un tipo de permiso con ese nombre' });
    }
    console.error(error);
    return res.status(500).json({ msg: 'Error al crear tipo de permiso', error });
  }
};

export const updateTipoPermiso = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  const { nombre, descripcion, requiere_horas, requiere_soporte, requiere_fecha_fin,
    minimo_dias_general, minimo_dias_gestion_admin, es_para_cc_filtrado, orden } = req.body;

  try {
    const tipo = await TipoPermiso.findByPk(id);
    if (!tipo) {
      return res.status(404).json({ msg: 'Tipo de permiso no encontrado' });
    }

    await tipo.update({
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
      ...(requiere_horas !== undefined && { requiere_horas }),
      ...(requiere_soporte !== undefined && { requiere_soporte }),
      ...(requiere_fecha_fin !== undefined && { requiere_fecha_fin }),
      ...(minimo_dias_general !== undefined && { minimo_dias_general: minimo_dias_general || null }),
      ...(minimo_dias_gestion_admin !== undefined && { minimo_dias_gestion_admin: minimo_dias_gestion_admin || null }),
      ...(es_para_cc_filtrado !== undefined && { es_para_cc_filtrado }),
      ...(orden !== undefined && { orden }),
    });

    return res.status(200).json(tipo);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ msg: 'Ya existe un tipo de permiso con ese nombre' });
    }
    console.error(error);
    return res.status(500).json({ msg: 'Error al actualizar tipo de permiso', error });
  }
};

export const toggleTipoPermiso = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);

  try {
    const tipo = await TipoPermiso.findByPk(id);
    if (!tipo) {
      return res.status(404).json({ msg: 'Tipo de permiso no encontrado' });
    }

    await tipo.update({ activo: !tipo.activo });
    return res.status(200).json(tipo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al cambiar estado', error });
  }
};

export const reorderTiposPermiso = async (req: Request, res: Response): Promise<any> => {
  const { orden } = req.body;
  // orden: Array<{ id: number, orden: number }>

  if (!Array.isArray(orden)) {
    return res.status(400).json({ msg: 'Se requiere un array de {id, orden}' });
  }

  try {
    await Promise.all(
      orden.map(({ id, orden: newOrden }: { id: number; orden: number }) =>
        TipoPermiso.update({ orden: newOrden }, { where: { id } })
      )
    );
    return res.status(200).json({ msg: 'Orden actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al reordenar tipos de permiso', error });
  }
};
