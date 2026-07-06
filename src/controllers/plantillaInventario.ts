import { Request, Response } from 'express';
import { PlantillaInventario, ItemPlantilla, InventarioUsuario } from '../models/plantillaInventario';
import { User } from '../models/user';

export const getPlantillas = async (_req: Request, res: Response): Promise<any> => {
  try {
    const plantillas = await PlantillaInventario.findAll({
      include: [{ model: ItemPlantilla, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(plantillas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener plantillas', error });
  }
};

export const getTodasAsignaciones = async (_req: Request, res: Response): Promise<any> => {
  try {
    const asignaciones = await InventarioUsuario.findAll({
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['Uid', 'name', 'lastName', 'email'],
        },
        {
          model: PlantillaInventario,
          as: 'plantilla',
          include: [{ model: ItemPlantilla, as: 'items' }],
        },
      ],
      order: [['fechaAsignacion', 'DESC']],
    });
    return res.status(200).json(asignaciones);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener asignaciones', error });
  }
};

export const actualizarAsignacion = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  const { plantillaId, observaciones, estado } = req.body;
  try {
    const asignacion = await InventarioUsuario.findByPk(id);
    if (!asignacion) return res.status(404).json({ msg: 'Asignación no encontrada' });

    if (plantillaId !== undefined) {
      const plantilla = await PlantillaInventario.findByPk(plantillaId);
      if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    }

    await asignacion.update({
      ...(plantillaId !== undefined && { plantillaId }),
      ...(observaciones !== undefined && { observaciones: observaciones || null }),
      ...(estado !== undefined && { estado }),
    });

    const resultado = await InventarioUsuario.findByPk(id, {
      include: [
        { model: User, as: 'usuario', attributes: ['Uid', 'name', 'lastName', 'email'] },
        { model: PlantillaInventario, as: 'plantilla', include: [{ model: ItemPlantilla, as: 'items' }] },
      ],
    });
    return res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al actualizar asignación', error });
  }
};

export const getPlantillaById = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const plantilla = await PlantillaInventario.findByPk(id, {
      include: [{ model: ItemPlantilla, as: 'items' }],
    });
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    return res.status(200).json(plantilla);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener plantilla', error });
  }
};

const validarItems = (items: any[]): string | null => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.nombre || String(item.nombre).trim() === '') {
      return `El ítem #${i + 1} debe tener un nombre`;
    }
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return `El ítem "${item.nombre}" debe tener una cantidad de al menos 1`;
    }
  }
  return null;
};

export const createPlantilla = async (req: Request, res: Response): Promise<any> => {
  const { nombre, descripcion, items } = req.body;

  if (!nombre || String(nombre).trim() === '') {
    return res.status(400).json({ msg: 'El nombre de la plantilla es obligatorio' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ msg: 'La plantilla debe tener al menos un ítem' });
  }
  const errorItem = validarItems(items);
  if (errorItem) return res.status(400).json({ msg: errorItem });

  try {
    const existente = await PlantillaInventario.findOne({ where: { nombre: String(nombre).trim() } });
    if (existente) return res.status(400).json({ msg: `Ya existe una plantilla llamada "${nombre}"` });

    const plantilla = await PlantillaInventario.create({
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      activo: true,
    });

    await ItemPlantilla.bulkCreate(
      items.map((item: any) => ({
        plantillaId: plantilla.id,
        nombre: String(item.nombre).trim(),
        categoria: item.categoria || 'otro',
        cantidad: Number(item.cantidad),
        unidad: item.unidad ? String(item.unidad).trim() : 'unidad',
        descripcion: item.descripcion ? String(item.descripcion).trim() : null,
      }))
    );

    const resultado = await PlantillaInventario.findByPk(plantilla.id, {
      include: [{ model: ItemPlantilla, as: 'items' }],
    });
    return res.status(201).json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al crear plantilla', error });
  }
};

export const updatePlantilla = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  const { nombre, descripcion, items } = req.body;

  if (nombre !== undefined && String(nombre).trim() === '') {
    return res.status(400).json({ msg: 'El nombre de la plantilla no puede estar vacío' });
  }
  if (Array.isArray(items)) {
    if (items.length === 0) {
      return res.status(400).json({ msg: 'La plantilla debe tener al menos un ítem' });
    }
    const errorItem = validarItems(items);
    if (errorItem) return res.status(400).json({ msg: errorItem });
  }

  try {
    const plantilla = await PlantillaInventario.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });

    if (nombre !== undefined) {
      const nombreTrim = String(nombre).trim();
      const duplicado = await PlantillaInventario.findOne({
        where: { nombre: nombreTrim },
      });
      if (duplicado && String(duplicado.id) !== id) {
        return res.status(400).json({ msg: `Ya existe otra plantilla llamada "${nombreTrim}"` });
      }
    }

    await plantilla.update({
      ...(nombre !== undefined && { nombre: String(nombre).trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion ? String(descripcion).trim() : null }),
    });

    if (Array.isArray(items)) {
      await ItemPlantilla.destroy({ where: { plantillaId: id } });
      await ItemPlantilla.bulkCreate(
        items.map((item: any) => ({
          plantillaId: plantilla.id,
          nombre: String(item.nombre).trim(),
          categoria: item.categoria || 'otro',
          cantidad: Number(item.cantidad),
          unidad: item.unidad ? String(item.unidad).trim() : 'unidad',
          descripcion: item.descripcion ? String(item.descripcion).trim() : null,
        }))
      );
    }

    const resultado = await PlantillaInventario.findByPk(id, {
      include: [{ model: ItemPlantilla, as: 'items' }],
    });
    return res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al actualizar plantilla', error });
  }
};

export const desactivarPlantilla = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const plantilla = await PlantillaInventario.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    await plantilla.update({ activo: !plantilla.activo });
    return res.status(200).json(plantilla);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al cambiar estado de plantilla', error });
  }
};

// --- Asignaciones a usuarios ---

export const getInventariosUsuario = async (req: Request, res: Response): Promise<any> => {
  const Uid = String(req.params.Uid);
  try {
    const inventarios = await InventarioUsuario.findAll({
      where: { Uid },
      include: [
        {
          model: PlantillaInventario,
          as: 'plantilla',
          include: [{ model: ItemPlantilla, as: 'items' }],
        },
      ],
      order: [['fechaAsignacion', 'DESC']],
    });
    return res.status(200).json(inventarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener inventarios del usuario', error });
  }
};

export const asignarInventario = async (req: Request, res: Response): Promise<any> => {
  const { Uid, plantillaId, observaciones } = req.body;

  if (!Uid || !plantillaId) {
    return res.status(400).json({ msg: 'Uid y plantillaId son obligatorios' });
  }

  try {
    const usuario = await User.findByPk(Uid);
    if (!usuario) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const plantilla = await PlantillaInventario.findByPk(plantillaId);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    if (!plantilla.activo) return res.status(400).json({ msg: 'La plantilla está desactivada' });

    const yaAsignada = await InventarioUsuario.findOne({ where: { Uid, plantillaId } });
    if (yaAsignada) {
      return res.status(400).json({ msg: `El usuario ya tiene asignada la plantilla "${plantilla.nombre}"` });
    }

    const asignacion = await InventarioUsuario.create({
      Uid,
      plantillaId,
      fechaAsignacion: new Date(),
      observaciones: observaciones || null,
      estado: 'activo',
    });

    return res.status(201).json(asignacion);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al asignar inventario', error });
  }
};

export const asignarInventarioMultiple = async (req: Request, res: Response): Promise<any> => {
  const { uids, plantillaId, observaciones } = req.body;

  if (!Array.isArray(uids) || uids.length === 0 || !plantillaId) {
    return res.status(400).json({ msg: 'uids (array) y plantillaId son obligatorios' });
  }

  try {
    const plantilla = await PlantillaInventario.findByPk(plantillaId);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    if (!plantilla.activo) return res.status(400).json({ msg: 'La plantilla está desactivada' });

    // Filtrar usuarios que ya tienen esta plantilla
    const yaAsignadas = await InventarioUsuario.findAll({ where: { plantillaId } });
    const uidsYaAsignados = new Set(yaAsignadas.map((a: any) => Number(a.Uid)));
    const uidsNuevos = uids.filter((uid: number) => !uidsYaAsignados.has(Number(uid)));

    if (uidsNuevos.length === 0) {
      return res.status(400).json({ msg: 'Todos los usuarios seleccionados ya tienen esta plantilla asignada' });
    }

    const nuevasAsignaciones = uidsNuevos.map((Uid: number) => ({
      Uid,
      plantillaId,
      fechaAsignacion: new Date(),
      observaciones: observaciones || null,
      estado: 'activo' as const,
    }));

    const creadas = await InventarioUsuario.bulkCreate(nuevasAsignaciones);
    const omitidos = uids.length - uidsNuevos.length;
    const msg = omitidos > 0
      ? `${creadas.length} asignaciones creadas (${omitidos} usuarios ya tenían esta plantilla)`
      : `${creadas.length} asignaciones creadas`;
    return res.status(201).json({ msg, asignaciones: creadas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al asignar inventarios', error });
  }
};

export const eliminarPlantilla = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const plantilla = await PlantillaInventario.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    // Eliminar ítems y asignaciones primero
    await ItemPlantilla.destroy({ where: { plantillaId: id } });
    await InventarioUsuario.destroy({ where: { plantillaId: id } });
    await plantilla.destroy();
    return res.status(200).json({ msg: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al eliminar plantilla', error });
  }
};

export const removerInventario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const asignacion = await InventarioUsuario.findByPk(id);
    if (!asignacion) return res.status(404).json({ msg: 'Asignación no encontrada' });
    await asignacion.destroy();
    return res.status(200).json({ msg: 'Asignación eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al remover inventario', error });
  }
};
