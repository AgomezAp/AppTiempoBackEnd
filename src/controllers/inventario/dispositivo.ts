import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Dispositivo, ActaEntrega, DetalleActa, MovimientoDispositivo } from '../../models/inventario/dispositivo';
import { getPhotoUrl } from '../../config/inventario-multer';
import { getIO } from '../../services/websocket.service';

export const obtenerDispositivos = async (req: Request, res: Response) => {
  try {
    const { estado, categoria, ubicacion, busqueda } = req.query;
    let where: any = {};
    if (estado && estado !== 'todos') where.estado = estado;
    if (categoria && categoria !== 'todas') where.categoria = categoria;
    if (ubicacion && ubicacion !== 'todas') where.ubicacion = ubicacion;
    if (busqueda) {
      where[Op.or] = [
        { marca: { [Op.iLike]: `%${busqueda}%` } },
        { modelo: { [Op.iLike]: `%${busqueda}%` } },
        { serial: { [Op.iLike]: `%${busqueda}%` } },
        { imei: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    const dispositivos = await Dispositivo.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(dispositivos);
  } catch (error) {
    console.error('Error al obtener dispositivos:', error);
    res.status(500).json({ msg: 'Error al obtener los dispositivos' });
  }
};

export const obtenerDisponibles = async (req: Request, res: Response) => {
  try {
    const dispositivos = await Dispositivo.findAll({
      where: {
        [Op.or]: [
          { tipoRegistro: { [Op.ne]: 'stock' }, estado: 'disponible' },
          { tipoRegistro: 'stock', stockActual: { [Op.gt]: 0 } }
        ]
      },
      order: [['categoria', 'ASC'], ['nombre', 'ASC']]
    });

    const dispositivosStock = dispositivos.filter(d => d.tipoRegistro === 'stock');
    let stockReservado: { [id: number]: number } = {};

    if (dispositivosStock.length > 0) {
      const stockIds = dispositivosStock.map(d => d.id);
      const detallesPendientes = await DetalleActa.findAll({
        where: { dispositivoId: stockIds },
        include: [{ model: ActaEntrega, as: 'acta', where: { estado: 'pendiente_firma' }, attributes: ['id'] }],
        attributes: ['dispositivoId', 'cantidad', 'actaId']
      });

      if (detallesPendientes.length > 0) {
        const movimientosReserva = await MovimientoDispositivo.findAll({
          where: { dispositivoId: stockIds, tipoMovimiento: 'reserva' as any },
          attributes: ['dispositivoId', 'actaId']
        });
        const reservaSet = new Set(movimientosReserva.map((m: any) => `${m.dispositivoId}-${m.actaId}`));
        for (const detalle of detallesPendientes) {
          const did = (detalle as any).dispositivoId;
          const actaId = (detalle as any).actaId;
          if (reservaSet.has(`${did}-${actaId}`)) {
            stockReservado[did] = (stockReservado[did] || 0) + ((detalle as any).cantidad || 1);
          }
        }
      }
    }

    const resultado = dispositivos.map(d => {
      const plain = d.toJSON();
      if (d.tipoRegistro === 'stock') {
        plain.stockDisponible = Math.max(0, (d.stockActual || 0) - (stockReservado[d.id] || 0));
      }
      return plain;
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener dispositivos disponibles:', error);
    res.status(500).json({ msg: 'Error al obtener los dispositivos disponibles' });
  }
};

export const obtenerDispositivoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dispositivo = await Dispositivo.findByPk(Number(id), {
      include: [{ model: MovimientoDispositivo, as: 'movimientos', order: [['fecha', 'DESC']] }]
    });
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    res.json(dispositivo);
  } catch (error) {
    console.error('Error al obtener dispositivo:', error);
    res.status(500).json({ msg: 'Error al obtener el dispositivo' });
  }
};

export const registrarDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria, marca, modelo, serial, imei, color, descripcion, condicion, ubicacion, observaciones, Uid, tipoRegistro, cantidad, stockMinimo } = req.body;
    const nombre = [marca, modelo].filter(Boolean).join(' ') || categoria || 'Dispositivo';
    const tipo = tipoRegistro || 'individual';

    if (serial && tipo === 'individual') {
      const existeSerial = await Dispositivo.findOne({ where: { serial } });
      if (existeSerial) { res.status(400).json({ msg: 'Ya existe un dispositivo con ese número de serie' }); return; }
    }

    let fotos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      fotos = (req.files as Express.Multer.File[]).map(file => getPhotoUrl(file.filename, 'dispositivos'));
    }

    if (tipo === 'stock') {
      const cantidadStock = parseInt(cantidad) || 1;
      const dispositivo = await Dispositivo.create({
        nombre, categoria, marca, modelo, serial: null, imei: null, color, descripcion,
        estado: 'disponible', condicion: condicion || 'nuevo',
        ubicacion: ubicacion || 'Almacén Principal', fotos: JSON.stringify(fotos),
        fechaIngreso: new Date(), observaciones, Uid, tipoRegistro: 'stock',
        stockActual: cantidadStock, stockMinimo: stockMinimo || 0
      });
      await MovimientoDispositivo.create({
        dispositivoId: dispositivo.id, tipoMovimiento: 'ingreso', estadoAnterior: null,
        estadoNuevo: 'disponible', descripcion: `Ingreso inicial de ${cantidadStock} unidades de ${nombre}`,
        fecha: new Date(), Uid
      });
      try { const io = getIO(); io.to('inventario').emit('dispositivo:created', { dispositivo }); } catch (e) {}
      res.status(201).json({ msg: `Se registraron ${cantidadStock} unidades exitosamente`, dispositivo });
    } else {
      const dispositivo = await Dispositivo.create({
        nombre, categoria, marca, modelo, serial, imei, color, descripcion,
        estado: 'disponible', condicion: condicion || 'bueno',
        ubicacion: ubicacion || 'Almacén Principal', fotos: JSON.stringify(fotos),
        fechaIngreso: new Date(), observaciones, Uid, tipoRegistro: 'individual', stockActual: 1, stockMinimo: 0
      });
      await MovimientoDispositivo.create({
        dispositivoId: dispositivo.id, tipoMovimiento: 'ingreso', estadoAnterior: null,
        estadoNuevo: 'disponible', descripcion: `Dispositivo ${nombre} ingresado al inventario`,
        fecha: new Date(), Uid
      });
      try { const io = getIO(); io.to('inventario').emit('dispositivo:created', { dispositivo }); } catch (e) {}
      res.status(201).json({ msg: 'Dispositivo registrado exitosamente', dispositivo });
    }
  } catch (error: any) {
    console.error('Error al registrar dispositivo:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'campo';
      res.status(400).json({ msg: `Ya existe un dispositivo con ese ${field}.`, error: 'duplicate_entry' }); return;
    }
    res.status(500).json({ msg: 'Error al registrar el dispositivo' });
  }
};

export const actualizarDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { categoria, marca, modelo, serial, imei, color, descripcion, condicion, ubicacion, observaciones, Uid } = req.body;
    const nombre = [marca, modelo].filter(Boolean).join(' ') || categoria || 'Dispositivo';
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    await dispositivo.update({ nombre, categoria, marca, modelo, serial, imei, color, descripcion, condicion, ubicacion, observaciones });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'actualizacion', descripcion: 'Dispositivo actualizado', fecha: new Date(), Uid
    });
    try { const io = getIO(); io.to('inventario').emit('dispositivo:updated', { dispositivo }); } catch (e) {}
    res.json({ msg: 'Dispositivo actualizado exitosamente', dispositivo });
  } catch (error) {
    console.error('Error al actualizar dispositivo:', error);
    res.status(500).json({ msg: 'Error al actualizar el dispositivo' });
  }
};

export const cambiarEstadoDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoEstado, motivo, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    const estadoAnterior = dispositivo.estado;
    await dispositivo.update({ estado: nuevoEstado });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'cambio_estado', estadoAnterior,
      estadoNuevo: nuevoEstado, descripcion: motivo || `Estado cambiado de ${estadoAnterior} a ${nuevoEstado}`,
      fecha: new Date(), Uid
    });
    try { const io = getIO(); io.to('inventario').emit('dispositivo:updated', { dispositivo, estadoAnterior, nuevoEstado }); } catch (e) {}
    res.json({ msg: 'Estado actualizado exitosamente', dispositivo });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ msg: 'Error al cambiar el estado del dispositivo' });
  }
};

export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const stats = await Dispositivo.findAll({
      attributes: ['estado', [Dispositivo.sequelize!.fn('COUNT', Dispositivo.sequelize!.col('id')), 'cantidad']],
      group: ['estado']
    });
    const categorias = await Dispositivo.findAll({
      attributes: ['categoria', [Dispositivo.sequelize!.fn('COUNT', Dispositivo.sequelize!.col('id')), 'cantidad']],
      group: ['categoria']
    });
    const total = await Dispositivo.count();
    res.json({ total, porEstado: stats, porCategoria: categorias });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

export const obtenerTrazabilidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movimientos = await MovimientoDispositivo.findAll({
      where: { dispositivoId: id },
      order: [['fecha', 'DESC']],
      include: [{ model: Dispositivo, as: 'dispositivo', attributes: ['nombre', 'categoria', 'marca', 'modelo'] }]
    });
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener trazabilidad:', error);
    res.status(500).json({ msg: 'Error al obtener la trazabilidad' });
  }
};

export const darDeBajaDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo, nuevoEstado, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    if (dispositivo.estado === 'entregado') { res.status(400).json({ msg: 'No se puede dar de baja un dispositivo que está entregado' }); return; }
    const estadoAnterior = dispositivo.estado;
    await dispositivo.update({ estado: nuevoEstado });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'baja', estadoAnterior, estadoNuevo: nuevoEstado,
      descripcion: `Dispositivo dado de baja: ${motivo}`, fecha: new Date(), Uid
    });
    res.json({ msg: `Dispositivo marcado como ${nuevoEstado}`, dispositivo });
  } catch (error) {
    console.error('Error al dar de baja dispositivo:', error);
    res.status(500).json({ msg: 'Error al dar de baja el dispositivo' });
  }
};

export const agregarStockDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    if (dispositivo.tipoRegistro !== 'stock') { res.status(400).json({ msg: 'Esta operación solo aplica para dispositivos de stock' }); return; }
    const cantidadNum = parseInt(cantidad);
    if (!cantidadNum || cantidadNum <= 0) { res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const stockAnterior = dispositivo.stockActual;
    const stockNuevo = stockAnterior + cantidadNum;
    await dispositivo.update({ stockActual: stockNuevo });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'entrada_stock',
      estadoAnterior: `stock: ${stockAnterior}`, estadoNuevo: `stock: ${stockNuevo}`,
      descripcion: descripcion || `Se agregaron ${cantidadNum} unidades. Motivo: ${motivo || 'compra'}`,
      fecha: new Date(), Uid
    });
    res.json({ msg: `Se agregaron ${cantidadNum} unidades exitosamente`, dispositivo, stockAnterior, stockActual: stockNuevo });
  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

export const retirarStockDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    if (dispositivo.tipoRegistro !== 'stock') { res.status(400).json({ msg: 'Esta operación solo aplica para dispositivos de stock' }); return; }
    const cantidadNum = parseInt(cantidad);
    if (!cantidadNum || cantidadNum <= 0) { res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    if (dispositivo.stockActual < cantidadNum) { res.status(400).json({ msg: `Stock insuficiente. Disponible: ${dispositivo.stockActual} unidades` }); return; }
    const stockAnterior = dispositivo.stockActual;
    const stockNuevo = stockAnterior - cantidadNum;
    await dispositivo.update({ stockActual: stockNuevo });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'salida_stock',
      estadoAnterior: `stock: ${stockAnterior}`, estadoNuevo: `stock: ${stockNuevo}`,
      descripcion: descripcion || `Se retiraron ${cantidadNum} unidades. Motivo: ${motivo || 'entrega'}`,
      fecha: new Date(), Uid
    });
    res.json({ msg: `Se retiraron ${cantidadNum} unidades exitosamente`, dispositivo, stockAnterior, stockActual: stockNuevo });
  } catch (error) {
    console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

export const convertirAStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cantidad, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    if (dispositivo.tipoRegistro === 'stock') { res.status(400).json({ msg: 'Este dispositivo ya está en modo stock' }); return; }
    const cantidadNum = parseInt(cantidad) || 1;
    if (cantidadNum <= 0) { res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' }); return; }
    const serialAnterior = dispositivo.serial;
    const estadoAnterior = dispositivo.estado;
    await dispositivo.update({ tipoRegistro: 'stock', stockActual: cantidadNum, stockMinimo: 1, serial: null, estado: 'disponible' });
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id, tipoMovimiento: 'conversion_stock',
      estadoAnterior: `individual (${estadoAnterior}, serial: ${serialAnterior})`,
      estadoNuevo: `stock (${cantidadNum} unidades)`,
      descripcion: `Dispositivo convertido de individual a stock. Cantidad inicial: ${cantidadNum}`,
      fecha: new Date(), Uid
    });
    const io = getIO();
    io.emit('dispositivo_actualizado', dispositivo);
    res.json({ msg: `Dispositivo convertido a modo stock exitosamente`, dispositivo, stockActual: cantidadNum });
  } catch (error) {
    console.error('Error al convertir a stock:', error);
    res.status(500).json({ msg: 'Error al convertir el dispositivo' });
  }
};

export const eliminarDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo, Uid } = req.body;
    const dispositivo = await Dispositivo.findByPk(Number(id));
    if (!dispositivo) { res.status(404).json({ msg: 'Dispositivo no encontrado' }); return; }
    const infoDispositivo = {
      id: dispositivo.id, nombre: dispositivo.nombre, categoria: dispositivo.categoria,
      marca: dispositivo.marca, modelo: dispositivo.modelo, serial: dispositivo.serial,
      imei: dispositivo.imei, estado: dispositivo.estado,
      tipoRegistro: dispositivo.tipoRegistro, stockActual: dispositivo.stockActual
    };
    await MovimientoDispositivo.destroy({ where: { dispositivoId: dispositivo.id } });
    await dispositivo.destroy();
    console.log(`Dispositivo eliminado: ${JSON.stringify(infoDispositivo)}. Motivo: ${motivo || 'No especificado'}. Usuario: ${Uid}`);
    const io = getIO();
    io.emit('dispositivo_eliminado', infoDispositivo);
    res.json({ msg: 'Dispositivo eliminado correctamente', dispositivo: infoDispositivo });
  } catch (error) {
    console.error('Error al eliminar dispositivo:', error);
    res.status(500).json({ msg: 'Error al eliminar el dispositivo' });
  }
};
