import { Request, Response } from 'express';
import sequelizeInventario from '../../database/connection-inventario';
import { Dispositivo } from '../../models/inventario/dispositivo';
import { Consumible, Mobiliario, TipoInventario } from '../../models/inventario/consumibles';
import CampoTipoInventario from '../../models/inventario/campoTipoInventario';

const CAMPOS_DISPOSITIVO  = ['nombre', 'categoria', 'descripcion', 'observaciones', 'ubicacion', 'color', 'marca', 'modelo'];
const CAMPOS_MOBILIARIO   = ['nombre', 'categoria', 'descripcion', 'observaciones', 'ubicacionAlmacen', 'proveedor'];
const CAMPOS_CONSUMIBLE   = ['nombre', 'categoria', 'descripcion', 'observaciones', 'ubicacionAlmacen', 'proveedor', 'stockMinimo', 'stockMaximo'];

const filtrarCampos = (body: any, permitidos: string[]) => {
  const data: Record<string, any> = {};
  for (const campo of permitidos) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }
  return data;
};

// ─── LISTAR TODO ─────────────────────────────────────────────────────────────

export const getInventarioCompleto = async (_req: Request, res: Response): Promise<any> => {
  try {
    const [dispositivos, mobiliario, tiposInventario] = await Promise.all([
      Dispositivo.findAll({ order: [['nombre', 'ASC']] }),
      Mobiliario.findAll({ order: [['nombre', 'ASC']] }),
      TipoInventario.findAll({
        where: { activo: true },
        order: [['orden', 'ASC']],
        include: [{ model: Consumible, as: 'consumibles', order: [['nombre', 'ASC']] }],
      }),
    ]);
    return res.status(200).json({ dispositivos, mobiliario, tiposInventario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener inventario completo', error });
  }
};

// ─── DISPOSITIVOS ────────────────────────────────────────────────────────────

export const editarDispositivo = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Dispositivo.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Dispositivo no encontrado' });
    const data = filtrarCampos(req.body, CAMPOS_DISPOSITIVO);
    if (data.nombre !== undefined && String(data.nombre).trim() === '') {
      return res.status(400).json({ msg: 'El nombre no puede estar vacío' });
    }
    await item.update(data);
    return res.status(200).json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al editar dispositivo', error });
  }
};

export const ocultarDispositivo = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Dispositivo.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Dispositivo no encontrado' });
    await item.update({ estado: 'obsoleto' });
    return res.status(200).json({ msg: 'Dispositivo ocultado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al ocultar dispositivo', error });
  }
};

export const restaurarDispositivo = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Dispositivo.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Dispositivo no encontrado' });
    await item.update({ estado: 'disponible' });
    return res.status(200).json({ msg: 'Dispositivo restaurado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al restaurar dispositivo', error });
  }
};

// ─── MOBILIARIO ──────────────────────────────────────────────────────────────

export const editarMobiliario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Mobiliario.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Mobiliario no encontrado' });
    const data = filtrarCampos(req.body, CAMPOS_MOBILIARIO);
    if (data.nombre !== undefined && String(data.nombre).trim() === '') {
      return res.status(400).json({ msg: 'El nombre no puede estar vacío' });
    }
    await item.update(data);
    return res.status(200).json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al editar mobiliario', error });
  }
};

export const ocultarMobiliario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Mobiliario.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Mobiliario no encontrado' });
    await item.update({ activo: false });
    return res.status(200).json({ msg: 'Mobiliario ocultado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al ocultar mobiliario', error });
  }
};

export const restaurarMobiliario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Mobiliario.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Mobiliario no encontrado' });
    await item.update({ activo: true });
    return res.status(200).json({ msg: 'Mobiliario restaurado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al restaurar mobiliario', error });
  }
};

// ─── CONSUMIBLES ─────────────────────────────────────────────────────────────

export const editarConsumible = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Consumible.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Consumible no encontrado' });
    const data = filtrarCampos(req.body, CAMPOS_CONSUMIBLE);
    if (data.nombre !== undefined && String(data.nombre).trim() === '') {
      return res.status(400).json({ msg: 'El nombre no puede estar vacío' });
    }
    if (data.stockMinimo !== undefined && Number(data.stockMinimo) < 0) {
      return res.status(400).json({ msg: 'El stock mínimo no puede ser negativo' });
    }
    await item.update(data);
    return res.status(200).json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al editar consumible', error });
  }
};

export const ocultarConsumible = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Consumible.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Consumible no encontrado' });
    await item.update({ activo: false });
    return res.status(200).json({ msg: 'Consumible ocultado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al ocultar consumible', error });
  }
};

export const restaurarConsumible = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  try {
    const item = await Consumible.findByPk(id);
    if (!item) return res.status(404).json({ msg: 'Consumible no encontrado' });
    await item.update({ activo: true });
    return res.status(200).json({ msg: 'Consumible restaurado', item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al restaurar consumible', error });
  }
};

// ─── CREAR INVENTARIO COMPLETO (tipo + ítems iniciales) ─────────────────────

export const crearInventarioCompleto = async (req: Request, res: Response): Promise<any> => {
  const { nombre, codigo, descripcion, items } = req.body;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ msg: 'El nombre del inventario es obligatorio.' });
  }
  if (!codigo || !String(codigo).trim()) {
    return res.status(400).json({ msg: 'El código del inventario es obligatorio.' });
  }
  if (!/^[a-z0-9_]+$/.test(String(codigo).trim())) {
    return res.status(400).json({ msg: 'El código solo puede contener letras minúsculas, números y guiones bajos.' });
  }

  const existente = await TipoInventario.findOne({ where: { codigo: String(codigo).trim() } });
  if (existente) {
    return res.status(409).json({ msg: `Ya existe un inventario con el código "${codigo}".` });
  }

  const transaction = await sequelizeInventario.transaction();
  try {
    const maxOrden: any = await TipoInventario.max('orden');
    const nuevoTipo = await TipoInventario.create({
      nombre: String(nombre).trim(),
      codigo: String(codigo).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      icono: 'fa-box',
      color: '#6c757d',
      orden: (maxOrden || 0) + 1,
      activo: true,
    }, { transaction });

    const itemsCreados: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.nombre || !String(item.nombre).trim()) continue;
        const consumible = await Consumible.create({
          tipoInventarioId: (nuevoTipo as any).id,
          nombre: String(item.nombre).trim(),
          categoria: item.categoria ? String(item.categoria).trim() : null,
          descripcion: item.descripcion ? String(item.descripcion).trim() : null,
          unidadMedida: item.unidadMedida ? String(item.unidadMedida).trim() : 'unidad',
          stockActual: Number(item.stockActual) || 0,
          stockMinimo: Number(item.stockMinimo) || 0,
          stockMaximo: Number(item.stockMaximo) || 0,
          ubicacionAlmacen: item.ubicacion ? String(item.ubicacion).trim() : null,
          activo: true,
        }, { transaction });
        itemsCreados.push(consumible);
      }
    }

    const camposCreados: any[] = [];
    const { campos } = req.body;
    if (Array.isArray(campos) && campos.length > 0) {
      for (let idx = 0; idx < campos.length; idx++) {
        const c = campos[idx];
        if (!c.nombre || !String(c.nombre).trim()) continue;
        if (!c.clave || !/^[a-z0-9_]+$/.test(String(c.clave).trim())) continue;
        const campo = await CampoTipoInventario.create({
          tipoInventarioId: (nuevoTipo as any).id,
          nombre: String(c.nombre).trim(),
          clave: String(c.clave).trim(),
          tipo_campo: c.tipo_campo || 'texto',
          requerido: c.requerido === true || c.requerido === 'true',
          orden: idx + 1,
          activo: true,
        }, { transaction });
        camposCreados.push(campo);
      }
    }

    await transaction.commit();
    return res.status(201).json({
      msg: `Inventario "${nombre}" creado exitosamente con ${camposCreados.length} campo(s) y ${itemsCreados.length} ítem(s).`,
      tipo: nuevoTipo,
      campos: camposCreados,
      items: itemsCreados,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return res.status(500).json({ msg: 'Error al crear el inventario', error });
  }
};

// ─── CAMPOS DEL TIPO INVENTARIO ──────────────────────────────────────────────

export const getCamposPorTipo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { tipoId } = req.params;
    const campos = await CampoTipoInventario.findAll({
      where: { tipoInventarioId: Number(tipoId) },
      order: [['orden', 'ASC']],
    });
    return res.status(200).json(campos);
  } catch (error) {
    return res.status(500).json({ msg: 'Error al obtener campos', error });
  }
};

export const crearCampo = async (req: Request, res: Response): Promise<any> => {
  const { tipoInventarioId, nombre, clave, tipo_campo, requerido, orden } = req.body;
  if (!tipoInventarioId || !nombre || !String(nombre).trim()) {
    return res.status(400).json({ msg: 'tipoInventarioId y nombre son obligatorios.' });
  }
  if (!clave || !/^[a-z0-9_]+$/.test(String(clave).trim())) {
    return res.status(400).json({ msg: 'La clave debe tener solo minúsculas, números y guiones bajos.' });
  }
  const existente = await CampoTipoInventario.findOne({ where: { tipoInventarioId: Number(tipoInventarioId), clave: String(clave).trim() } });
  if (existente) return res.status(409).json({ msg: `Ya existe un campo con la clave "${clave}" en este inventario.` });

  const maxOrden: any = await CampoTipoInventario.max('orden', { where: { tipoInventarioId: Number(tipoInventarioId) } });
  const campo = await CampoTipoInventario.create({
    tipoInventarioId: Number(tipoInventarioId),
    nombre: String(nombre).trim(),
    clave: String(clave).trim(),
    tipo_campo: tipo_campo || 'texto',
    requerido: requerido === true || requerido === 'true',
    orden: orden !== undefined ? Number(orden) : (maxOrden || 0) + 1,
    activo: true,
  });
  return res.status(201).json({ msg: 'Campo creado', campo });
};

export const actualizarCampo = async (req: Request, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const campo = await CampoTipoInventario.findByPk(id);
    if (!campo) return res.status(404).json({ msg: 'Campo no encontrado' });
    const { nombre, tipo_campo, requerido, orden, activo } = req.body;
    await campo.update({
      nombre: nombre !== undefined ? String(nombre).trim() : campo.nombre,
      tipo_campo: tipo_campo || campo.tipo_campo,
      requerido: requerido !== undefined ? (requerido === true || requerido === 'true') : campo.requerido,
      orden: orden !== undefined ? Number(orden) : campo.orden,
      activo: activo !== undefined ? activo : campo.activo,
    });
    return res.status(200).json({ msg: 'Campo actualizado', campo });
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar campo', error });
  }
};

export const eliminarCampo = async (req: Request, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const campo = await CampoTipoInventario.findByPk(id);
    if (!campo) return res.status(404).json({ msg: 'Campo no encontrado' });
    await campo.destroy();
    return res.status(200).json({ msg: 'Campo eliminado' });
  } catch (error) {
    return res.status(500).json({ msg: 'Error al eliminar campo', error });
  }
};

// ─── LISTAR TIPOS DE INVENTARIO ──────────────────────────────────────────────

export const listarTiposInventario = async (_req: Request, res: Response): Promise<any> => {
  try {
    const tipos = await TipoInventario.findAll({ order: [['orden', 'ASC']] });
    return res.status(200).json(tipos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al listar tipos de inventario', error });
  }
};
