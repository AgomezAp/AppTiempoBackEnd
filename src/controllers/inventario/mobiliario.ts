import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';
import { Mobiliario, MovimientoMobiliario } from '../../models/inventario/consumibles';
import { getIO } from '../../services/websocket.service';
import { getPhotoUrl } from '../../config/inventario-multer';

export const obtenerMobiliario = async (req: Request, res: Response) => {
  try {
    const { categoria, busqueda, activo } = req.query;
    let where: any = {};
    where.activo = activo !== 'false';
    if (categoria && categoria !== 'todas') where.categoria = categoria;
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        { proveedor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    const mobiliario = await Mobiliario.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario' });
  }
};

export const obtenerMobiliarioDisponible = async (req: Request, res: Response) => {
  try {
    const mobiliario = await Mobiliario.findAll({
      where: { activo: true, stockActual: { [Op.gt]: 0 } },
      order: [['categoria', 'ASC'], ['nombre', 'ASC']]
    });
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario disponible:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario disponible' });
  }
};

export const obtenerMobiliarioPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const mueble = await Mobiliario.findByPk(Number(id), {
      include: [{ model: MovimientoMobiliario, as: 'movimientos', order: [['fecha', 'DESC']] }]
    });
    if (!mueble) { res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    res.json(mueble);
  } catch (error) {
    console.error('Error al obtener mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario' });
  }
};

export const registrarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, categoria, descripcion, unidadMedida, stockActual, ubicacionAlmacen, proveedor, precioUnitario, observaciones, Uid } = req.body;
    let foto = '';
    if (req.file) foto = req.file.filename;
    const nuevoMobiliario = await Mobiliario.create({
      nombre, categoria, descripcion, unidadMedida: unidadMedida || 'unidad',
      stockActual: stockActual || 0, ubicacionAlmacen, proveedor, precioUnitario,
      foto, activo: true, observaciones, Uid
    });
    if (stockActual && stockActual > 0) {
      await MovimientoMobiliario.create({
        mobiliarioId: nuevoMobiliario.id, tipoMovimiento: 'entrada', cantidad: stockActual,
        stockAnterior: 0, stockNuevo: stockActual, motivo: 'ingreso_inicial',
        descripcion: 'Stock inicial al registrar el mobiliario', fecha: new Date(), Uid
      });
    }
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:created', nuevoMobiliario); } catch (e) {}
    res.status(201).json({ msg: 'Mobiliario registrado exitosamente', mobiliario: nuevoMobiliario });
  } catch (error: any) {
    console.error('Error al registrar mobiliario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'campo';
      res.status(400).json({ msg: `Ya existe un mobiliario con ese ${field}.`, error: 'duplicate_entry' }); return;
    }
    res.status(500).json({ msg: 'Error al registrar el mobiliario' });
  }
};

export const actualizarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, categoria, descripcion, unidadMedida, ubicacionAlmacen, proveedor, precioUnitario, observaciones } = req.body;
    const mueble = await Mobiliario.findByPk(Number(id));
    if (!mueble) { res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    let foto = mueble.foto;
    if (req.file) foto = req.file.filename;
    await mueble.update({
      nombre: nombre || mueble.nombre, categoria: categoria || mueble.categoria,
      descripcion: descripcion !== undefined ? descripcion : mueble.descripcion,
      unidadMedida: unidadMedida || mueble.unidadMedida,
      ubicacionAlmacen: ubicacionAlmacen !== undefined ? ubicacionAlmacen : mueble.ubicacionAlmacen,
      proveedor: proveedor !== undefined ? proveedor : mueble.proveedor,
      precioUnitario: precioUnitario !== undefined ? precioUnitario : mueble.precioUnitario,
      foto, observaciones: observaciones !== undefined ? observaciones : mueble.observaciones
    });
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:updated', mueble); } catch (e) {}
    res.json({ msg: 'Mobiliario actualizado exitosamente', mobiliario: mueble });
  } catch (error) {
    console.error('Error al actualizar mobiliario:', error);
    res.status(500).json({ msg: 'Error al actualizar el mobiliario' });
  }
};

export const agregarStockMobiliario = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, numeroDocumento, Uid } = req.body;
    if (!cantidad || cantidad <= 0) { await t.rollback(); res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    if (!mueble) { await t.rollback(); res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior + cantidad;
    await mueble.update({ stockActual: stockNuevo }, { transaction: t });
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id, tipoMovimiento: 'entrada', cantidad,
      stockAnterior, stockNuevo, motivo: motivo || 'compra', descripcion, numeroDocumento,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:stockUpdated', { id: mueble.id, stockActual: stockNuevo }); } catch (e) {}
    res.json({ msg: `Se agregaron ${cantidad} ${mueble.unidadMedida}(s) al inventario`, mobiliario: mueble, stockAnterior, stockNuevo });
  } catch (error) {
    await t.rollback(); console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

export const retirarStockMobiliario = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, actaEntregaId, Uid } = req.body;
    if (!cantidad || cantidad <= 0) { await t.rollback(); res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    if (!mueble) { await t.rollback(); res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    if (mueble.stockActual < cantidad) { await t.rollback(); res.status(400).json({ msg: `Stock insuficiente. Disponible: ${mueble.stockActual}` }); return; }
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior - cantidad;
    await mueble.update({ stockActual: stockNuevo }, { transaction: t });
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id, tipoMovimiento: 'salida', cantidad,
      stockAnterior, stockNuevo, motivo: motivo || 'entrega', descripcion, actaEntregaId,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:stockUpdated', { id: mueble.id, stockActual: stockNuevo }); } catch (e) {}
    res.json({ msg: `Se retiraron ${cantidad} ${mueble.unidadMedida}(s) del inventario`, mobiliario: mueble, stockAnterior, stockNuevo });
  } catch (error) {
    await t.rollback(); console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

export const ajustarStockMobiliario = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { nuevoStock, motivo, descripcion, Uid } = req.body;
    if (nuevoStock === undefined || nuevoStock < 0) { await t.rollback(); res.status(400).json({ msg: 'El nuevo stock debe ser >= 0' }); return; }
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    if (!mueble) { await t.rollback(); res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    const stockAnterior = mueble.stockActual;
    await mueble.update({ stockActual: nuevoStock }, { transaction: t });
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id, tipoMovimiento: 'ajuste',
      cantidad: Math.abs(nuevoStock - stockAnterior), stockAnterior, stockNuevo: nuevoStock,
      motivo: motivo || 'ajuste_inventario',
      descripcion: descripcion || `Ajuste de stock de ${stockAnterior} a ${nuevoStock}`,
      fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:stockUpdated', { id: mueble.id, stockActual: nuevoStock }); } catch (e) {}
    res.json({ msg: 'Stock ajustado exitosamente', mobiliario: mueble, stockAnterior, stockNuevo: nuevoStock });
  } catch (error) {
    await t.rollback(); console.error('Error al ajustar stock:', error);
    res.status(500).json({ msg: 'Error al ajustar el stock' });
  }
};

export const obtenerEstadisticasMobiliario = async (req: Request, res: Response) => {
  try {
    const where = { activo: true };
    const total = await Mobiliario.count({ where });
    const stockTotal = await Mobiliario.sum('stockActual', { where }) || 0;
    const sinStock = await Mobiliario.count({ where: { ...where, stockActual: 0 } });
    const valorTotalResult = await Mobiliario.findAll({
      where,
      attributes: [[fn('SUM', literal('"stockActual" * COALESCE("precioUnitario", 0)')), 'valorTotal']],
      raw: true
    }) as any[];
    const valorTotal = valorTotalResult[0]?.valorTotal || 0;
    const porCategoria = await Mobiliario.findAll({
      where,
      attributes: ['categoria', [fn('COUNT', literal('*')), 'cantidad'], [fn('SUM', literal('"stockActual"')), 'totalStock']],
      group: ['categoria'],
      raw: true
    }) as any[];
    res.json({
      total, stockTotal, sinStock, valorTotal: parseFloat(valorTotal) || 0,
      porCategoria: porCategoria.map((item: any) => ({
        categoria: item.categoria, cantidad: parseInt(item.cantidad) || 0, totalStock: parseInt(item.totalStock) || 0
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

export const desactivarMobiliario = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { motivo, Uid } = req.body;
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    if (!mueble) { await t.rollback(); res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    await mueble.update({ activo: false }, { transaction: t });
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id, tipoMovimiento: 'baja', cantidad: mueble.stockActual,
      stockAnterior: mueble.stockActual, stockNuevo: 0, motivo: motivo || 'baja',
      descripcion: 'Mobiliario dado de baja del inventario', fecha: new Date(), Uid
    }, { transaction: t });
    await t.commit();
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:deleted', { id: mueble.id }); } catch (e) {}
    res.json({ msg: 'Mobiliario dado de baja exitosamente', mobiliario: mueble });
  } catch (error) {
    await t.rollback(); console.error('Error al dar de baja el mobiliario:', error);
    res.status(500).json({ msg: 'Error al dar de baja el mobiliario' });
  }
};

export const obtenerHistorialMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const movimientos = await MovimientoMobiliario.findAll({
      where: { mobiliarioId: Number(id) },
      order: [['fecha', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

export const convertirMobiliarioAStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, Uid } = req.body;
    const mueble = await Mobiliario.findByPk(Number(id));
    if (!mueble) { res.status(404).json({ msg: 'Mobiliario no encontrado' }); return; }
    if (mueble.tipoRegistro === 'stock') { res.status(400).json({ msg: 'Este mobiliario ya está en modo stock' }); return; }
    const cantidadNum = parseInt(cantidad) || 1;
    if (cantidadNum <= 0) { res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const serialAnterior = mueble.serial;
    const stockAnterior = mueble.stockActual || 1;
    await mueble.update({ tipoRegistro: 'stock', stockActual: cantidadNum, stockMinimo: 1, serial: null });
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id, tipoMovimiento: 'conversion_stock' as any,
      cantidad: cantidadNum - stockAnterior, stockAnterior, stockNuevo: cantidadNum, motivo: 'conversion',
      descripcion: `Mobiliario convertido de individual (serial: ${serialAnterior}) a stock. Cantidad: ${cantidadNum}`,
      fecha: new Date(), Uid
    });
    try { const io = getIO(); io.to('mobiliario').emit('mobiliario:updated', mueble); } catch (e) {}
    res.json({ msg: `Mobiliario convertido a modo stock exitosamente`, mobiliario: mueble, stockActual: cantidadNum });
  } catch (error) {
    console.error('Error al convertir mobiliario a stock:', error);
    res.status(500).json({ msg: 'Error al convertir el mobiliario' });
  }
};
