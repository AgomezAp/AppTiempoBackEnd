import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';
import { Consumible, MovimientoConsumible, TipoInventario } from '../../models/inventario/consumibles';

export const obtenerConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo, categoria, busqueda, activo } = req.query;
    let where: any = {};
    if (activo !== 'false') where.activo = true;
    if (categoria && categoria !== 'todas') where.categoria = categoria;
    if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
      if (tipo) where.tipoInventarioId = tipo.id;
    }
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        { proveedor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    const consumibles = await Consumible.findAll({
      where,
      include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }],
      order: [['nombre', 'ASC']]
    });
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles' });
  }
};

export const obtenerConsumiblesPorTipo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.params;
    const tipo = await TipoInventario.findOne({ where: { codigo, activo: true } });
    if (!tipo) { res.status(404).json({ msg: 'Tipo de inventario no encontrado' }); return; }
    const consumibles = await Consumible.findAll({
      where: { tipoInventarioId: tipo.id, activo: true },
      order: [['nombre', 'ASC']]
    });
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles por tipo:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles' });
  }
};

export const obtenerConsumiblePorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const consumible = await Consumible.findByPk(Number(id), {
      include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }]
    });
    if (!consumible) { res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    res.json(consumible);
  } catch (error) {
    console.error('Error al obtener consumible:', error);
    res.status(500).json({ msg: 'Error al obtener el consumible' });
  }
};

export const registrarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipoInventarioCodigo, nombre, categoria, descripcion, unidadMedida, stockActual, stockMinimo, stockMaximo, ubicacion, proveedor, precioUnitario, observaciones, Uid } = req.body;
    const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
    if (!tipo) { res.status(400).json({ msg: 'Tipo de inventario no válido' }); return; }
    const nuevo = await Consumible.create({
      tipoInventarioId: tipo.id, nombre, categoria, descripcion,
      unidadMedida: unidadMedida || 'unidad', stockActual: stockActual || 0,
      stockMinimo: stockMinimo || 0, stockMaximo, ubicacionAlmacen: ubicacion, proveedor, precioUnitario,
      observaciones, activo: true, Uid
    });
    if (stockActual && stockActual > 0) {
      await MovimientoConsumible.create({
        consumibleId: nuevo.id, tipoMovimiento: 'entrada', cantidad: stockActual,
        stockAnterior: 0, stockNuevo: stockActual, motivo: 'ingreso_inicial',
        descripcion: 'Stock inicial al registrar el consumible', fecha: new Date(), Uid
      });
    }
    res.status(201).json({ msg: 'Consumible registrado exitosamente', consumible: nuevo });
  } catch (error) {
    console.error('Error al registrar consumible:', error);
    res.status(500).json({ msg: 'Error al registrar el consumible' });
  }
};

export const actualizarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, categoria, descripcion, unidadMedida, stockMinimo, stockMaximo, ubicacion, proveedor, precioUnitario, observaciones } = req.body;
    const consumible = await Consumible.findByPk(Number(id));
    if (!consumible) { res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    await consumible.update({
      nombre: nombre || consumible.nombre, categoria: categoria || consumible.categoria,
      descripcion: descripcion !== undefined ? descripcion : consumible.descripcion,
      unidadMedida: unidadMedida || consumible.unidadMedida,
      stockMinimo: stockMinimo !== undefined ? stockMinimo : consumible.stockMinimo,
      stockMaximo: stockMaximo !== undefined ? stockMaximo : consumible.stockMaximo,
      ubicacionAlmacen: ubicacion !== undefined ? ubicacion : consumible.ubicacionAlmacen,
      proveedor: proveedor !== undefined ? proveedor : consumible.proveedor,
      precioUnitario: precioUnitario !== undefined ? precioUnitario : consumible.precioUnitario,
      observaciones: observaciones !== undefined ? observaciones : consumible.observaciones
    });
    res.json({ msg: 'Consumible actualizado exitosamente', consumible });
  } catch (error) {
    console.error('Error al actualizar consumible:', error);
    res.status(500).json({ msg: 'Error al actualizar el consumible' });
  }
};

export const agregarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, numeroDocumento, Uid } = req.body;
    if (!cantidad || cantidad <= 0) { await t.rollback(); res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const consumible = await Consumible.findByPk(Number(id), { transaction: t });
    if (!consumible) { await t.rollback(); res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    const stockAnterior = consumible.stockActual;
    const stockNuevo = stockAnterior + cantidad;
    await consumible.update({ stockActual: stockNuevo }, { transaction: t });
    await MovimientoConsumible.create({
      consumibleId: consumible.id, tipoMovimiento: 'entrada', cantidad,
      stockAnterior, stockNuevo, motivo: motivo || 'compra', descripcion, numeroDocumento,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    res.json({ msg: `Se agregaron ${cantidad} ${consumible.unidadMedida}(s)`, consumible, stockAnterior, stockNuevo });
  } catch (error) {
    await t.rollback(); console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

const TIPOS_INVENTARIO_RESTRINGIDOS = ['botiquin', 'aseo', 'papeleria', 'desechables', 'dotacion', 'herramientas'];

export const retirarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, actaEntregaId, Uid } = req.body;
    if (!cantidad || cantidad <= 0) { await t.rollback(); res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const consumible = await Consumible.findByPk(Number(id), { transaction: t, include: [{ model: TipoInventario, as: 'tipoInventario' }] });
    if (!consumible) { await t.rollback(); res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    const tipoInventario = (consumible as any).tipoInventario as TipoInventario | null;
    if (tipoInventario && TIPOS_INVENTARIO_RESTRINGIDOS.includes(tipoInventario.codigo)) {
      await t.rollback();
      res.status(403).json({ msg: `El inventario de ${tipoInventario.nombre} no permite retiro directo de stock. Use actas de entrega para registrar salidas.` });
      return;
    }
    if (consumible.stockActual < cantidad) { await t.rollback(); res.status(400).json({ msg: `Stock insuficiente. Disponible: ${consumible.stockActual}` }); return; }
    const stockAnterior = consumible.stockActual;
    const stockNuevo = stockAnterior - cantidad;
    await consumible.update({ stockActual: stockNuevo }, { transaction: t });
    await MovimientoConsumible.create({
      consumibleId: consumible.id, tipoMovimiento: 'salida', cantidad,
      stockAnterior, stockNuevo, motivo: motivo || 'entrega', descripcion, actaEntregaId,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    res.json({ msg: `Se retiraron ${cantidad} ${consumible.unidadMedida}(s)`, consumible, stockAnterior, stockNuevo });
  } catch (error) {
    await t.rollback(); console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

export const ajustarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { nuevoStock, motivo, descripcion, Uid } = req.body;
    if (nuevoStock === undefined || nuevoStock < 0) { await t.rollback(); res.status(400).json({ msg: 'El nuevo stock debe ser >= 0' }); return; }
    const consumible = await Consumible.findByPk(Number(id), { transaction: t, include: [{ model: TipoInventario, as: 'tipoInventario' }] });
    if (!consumible) { await t.rollback(); res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    const tipoInventario = (consumible as any).tipoInventario as TipoInventario | null;
    if (tipoInventario && TIPOS_INVENTARIO_RESTRINGIDOS.includes(tipoInventario.codigo)) {
      await t.rollback();
      res.status(403).json({ msg: `El inventario de ${tipoInventario.nombre} no permite ajuste directo de stock. Use actas de entrega para registrar salidas.` });
      return;
    }
    const stockAnterior = consumible.stockActual;
    await consumible.update({ stockActual: nuevoStock }, { transaction: t });
    await MovimientoConsumible.create({
      consumibleId: consumible.id, tipoMovimiento: 'ajuste',
      cantidad: Math.abs(nuevoStock - stockAnterior), stockAnterior, stockNuevo: nuevoStock,
      motivo: motivo || 'ajuste_inventario',
      descripcion: descripcion || `Ajuste de stock de ${stockAnterior} a ${nuevoStock}`,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    res.json({ msg: 'Stock ajustado exitosamente', consumible, stockAnterior, stockNuevo: nuevoStock });
  } catch (error) {
    await t.rollback(); console.error('Error al ajustar stock:', error);
    res.status(500).json({ msg: 'Error al ajustar el stock' });
  }
};

export const obtenerAlertasStock = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo, tipoInventarioId } = req.query;
    let where: any = { activo: true };
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    } else if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
      if (tipo) where.tipoInventarioId = tipo.id;
    }
    const consumibles = await Consumible.findAll({
      where: { ...where, stockActual: { [Op.lte]: sequelizeInventario.col('stockMinimo') as any } },
      include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }]
    });
    res.json({ alertas: consumibles, total: consumibles.length });
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ msg: 'Error al obtener las alertas de stock' });
  }
};

export const obtenerEstadisticasConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo, tipoInventarioId } = req.query;
    let where: any = { activo: true };
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    } else if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
      if (tipo) where.tipoInventarioId = tipo.id;
    }
    const total = await Consumible.count({ where });
    const sinStock = await Consumible.count({ where: { ...where, stockActual: 0 } });
    const conAlerta = await Consumible.count({
      where: { ...where, stockActual: { [Op.gt]: 0 }, stockMinimo: { [Op.gt]: 0 } }
    });
    const porTipo = await Consumible.findAll({
      where,
      include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['nombre', 'codigo'] }],
      attributes: ['tipoInventarioId', [fn('COUNT', col('Consumible.id')), 'cantidad'], [fn('SUM', col('"stockActual"')), 'totalStock']],
      group: ['tipoInventarioId', 'tipoInventario.id'],
      raw: false
    });
    res.json({ total, sinStock, conAlerta, porTipo });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

export const desactivarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const consumible = await Consumible.findByPk(Number(id));
    if (!consumible) { res.status(404).json({ msg: 'Consumible no encontrado' }); return; }
    await consumible.update({ activo: false });
    res.json({ msg: 'Consumible desactivado exitosamente' });
  } catch (error) {
    console.error('Error al desactivar consumible:', error);
    res.status(500).json({ msg: 'Error al desactivar el consumible' });
  }
};

export const obtenerHistorialConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const movimientos = await MovimientoConsumible.findAll({
      where: { consumibleId: Number(id) },
      order: [['fecha', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

export const obtenerConsumiblesDisponibles = async (req: Request, res: Response) => {
  try {
    const { tipo } = req.query;
    let where: any = { activo: true, stockActual: { [Op.gt]: 0 } };
    if (tipo) {
      const tipoInv = await TipoInventario.findOne({ where: { codigo: tipo, activo: true } });
      if (tipoInv) where.tipoInventarioId = tipoInv.id;
    }
    const consumibles = await Consumible.findAll({
      where,
      include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }],
      order: [['nombre', 'ASC']]
    });
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles disponibles:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles disponibles' });
  }
};
