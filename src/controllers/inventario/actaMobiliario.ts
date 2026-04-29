import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';
import {
  ActaMobiliario, DetalleActaMobiliario, TokenFirmaMobiliario,
  Mobiliario, MovimientoMobiliario
} from '../../models/inventario/consumibles';
import { getIO } from '../../services/websocket.service';
import { getPhotoUrl } from '../../config/inventario-multer';

const generarNumeroActaMobiliario = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const ultimaActa = await ActaMobiliario.findOne({
    where: { numeroActa: { [Op.like]: `ACTA-MOB-${year}-%` } },
    order: [['id', 'DESC']]
  });
  let numero = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    numero = parseInt(partes[partes.length - 1]) + 1;
  }
  return `ACTA-MOB-${year}-${numero.toString().padStart(4, '0')}`;
};

export const obtenerActasMobiliario = async (req: Request, res: Response) => {
  try {
    const { estado, busqueda, fechaInicio, fechaFin } = req.query;
    let where: any = {};
    if (estado && estado !== 'todas') where.estado = estado;
    if (busqueda) {
      where[Op.or] = [
        { numeroActa: { [Op.iLike]: `%${busqueda}%` } },
        { nombreReceptor: { [Op.iLike]: `%${busqueda}%` } },
        { cargoReceptor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    if (fechaInicio && fechaFin) {
      where.fechaEntrega = { [Op.between]: [new Date(fechaInicio as string), new Date(fechaFin as string)] };
    }
    const actas = await ActaMobiliario.findAll({
      where,
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario', attributes: ['id', 'nombre', 'categoria', 'unidadMedida', 'descripcion'] }] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas de mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener las actas de mobiliario' });
  }
};

export const obtenerActaMobiliarioPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await ActaMobiliario.findByPk(Number(id), {
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario' }] }]
    });
    if (!acta) { res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    res.json(acta);
  } catch (error) {
    console.error('Error al obtener acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

export const crearActaMobiliario = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { nombreReceptor, cedulaReceptor, cargoReceptor, telefonoReceptor, correoReceptor, fechaDevolucionEsperada, observacionesEntrega, muebles: mueblesRaw, Uid } = req.body;
    let muebles = mueblesRaw;
    if (typeof mueblesRaw === 'string') {
      try { muebles = JSON.parse(mueblesRaw); }
      catch (e) { await transaction.rollback(); res.status(400).json({ msg: 'Formato de muebles invalido' }); return; }
    }
    if (!muebles || !Array.isArray(muebles) || muebles.length === 0) {
      await transaction.rollback(); res.status(400).json({ msg: 'Debe seleccionar al menos un mueble' }); return;
    }
    const mueblesIds = muebles.map((m: any) => m.mobiliarioId);
    const mueblesDB = await Mobiliario.findAll({ where: { id: mueblesIds }, transaction });
    // Calcular reservas pendientes
    let stockReservado: { [id: number]: number } = {};
    const detallesPendientes = await DetalleActaMobiliario.findAll({
      where: { mobiliarioId: mueblesIds },
      include: [{ model: ActaMobiliario, as: 'acta', where: { estado: 'pendiente_firma' }, attributes: ['id'] }],
      attributes: ['mobiliarioId', 'cantidad'],
      transaction
    });
    for (const det of detallesPendientes) {
      const mid = (det as any).mobiliarioId;
      const tieneReserva = await MovimientoMobiliario.findOne({ where: { mobiliarioId: mid, tipoMovimiento: 'reserva' as any }, transaction });
      if (tieneReserva) stockReservado[mid] = (stockReservado[mid] || 0) + ((det as any).cantidad || 1);
    }
    const sinStock = muebles.filter((item: any) => {
      const mDb = mueblesDB.find((m: any) => m.id === item.mobiliarioId);
      if (!mDb) return true;
      const disponible = (mDb.stockActual || 0) - (stockReservado[mDb.id] || 0);
      return disponible < (item.cantidad || 1);
    });
    if (sinStock.length > 0) {
      await transaction.rollback();
      const nombres = sinStock.map((item: any) => {
        const m = mueblesDB.find((m: any) => m.id === item.mobiliarioId);
        const disponible = (m?.stockActual || 0) - (stockReservado[m?.id || 0] || 0);
        return `${m?.nombre || 'Desconocido'} (necesita ${item.cantidad}, disponible: ${disponible})`;
      });
      res.status(400).json({ msg: 'Stock insuficiente para algunos muebles', muebles: nombres }); return;
    }
    const numeroActa = await generarNumeroActaMobiliario();
    const acta = await ActaMobiliario.create({
      numeroActa, nombreReceptor, cedulaReceptor, cargoReceptor, telefonoReceptor, correoReceptor,
      firmaReceptor: null, fechaEntrega: new Date(), fechaDevolucionEsperada,
      estado: 'pendiente_firma', observacionesEntrega, Uid
    }, { transaction });
    // Procesar fotos
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const mobiliarioId = file.fieldname.replace('fotos_', '');
        if (!fotosMap[mobiliarioId]) fotosMap[mobiliarioId] = [];
        fotosMap[mobiliarioId].push(getPhotoUrl(file.filename, 'entregas'));
      }
    }
    for (const item of muebles) {
      const mueble = mueblesDB.find(m => m.id === item.mobiliarioId);
      if (!mueble) continue;
      const cantidadReservada = item.cantidad || 1;
      await DetalleActaMobiliario.create({
        actaMobiliarioId: acta.id, mobiliarioId: item.mobiliarioId,
        cantidad: cantidadReservada, condicionEntrega: item.condicionEntrega || 'bueno',
        fotosEntrega: JSON.stringify(fotosMap[item.mobiliarioId] || []),
        observacionesEntrega: item.observaciones, cantidadDevuelta: 0
      }, { transaction });
      await MovimientoMobiliario.create({
        mobiliarioId: item.mobiliarioId, tipoMovimiento: 'reserva' as any,
        cantidad: cantidadReservada, stockAnterior: mueble.stockActual, stockNuevo: mueble.stockActual,
        motivo: 'reserva_acta',
        descripcion: `Reserva para ${nombreReceptor} (${cargoReceptor}) - ${cantidadReservada} ${mueble.unidadMedida || 'und.'} - Acta ${numeroActa} pendiente firma`,
        actaEntregaId: acta.id, fecha: new Date(), Uid
      }, { transaction });
    }
    await transaction.commit();
    const actaCompleta = await ActaMobiliario.findByPk(acta.id, {
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario' }] }]
    });
    try { const io = getIO(); io.to('actas-mobiliario').emit('actaMobiliario:created', actaCompleta); } catch (e) {}
    res.status(201).json({ msg: 'Acta de mobiliario creada exitosamente', acta: actaCompleta });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al crear el acta de mobiliario' });
  }
};

export const registrarDevolucionMobiliario = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { devoluciones: devolucionesRaw, observacionesDevolucion, Uid } = req.body;
    let devoluciones = devolucionesRaw;
    if (typeof devolucionesRaw === 'string') {
      try { devoluciones = JSON.parse(devolucionesRaw); }
      catch (e) { await transaction.rollback(); res.status(400).json({ msg: 'Formato de devoluciones invalido' }); return; }
    }
    const acta = await ActaMobiliario.findByPk(Number(id), { include: [{ model: DetalleActaMobiliario, as: 'detalles' }], transaction });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (!['activa', 'devuelta_parcial'].includes(acta.estado)) {
      await transaction.rollback(); res.status(400).json({ msg: 'Solo se pueden devolver actas activas o con devolucion parcial' }); return;
    }
    // Procesar fotos
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const detalleId = file.fieldname.replace('fotos_devolucion_', '');
        if (!fotosMap[detalleId]) fotosMap[detalleId] = [];
        fotosMap[detalleId].push(getPhotoUrl(file.filename, 'devoluciones'));
      }
    }
    for (const devolucion of devoluciones) {
      const detalle = await DetalleActaMobiliario.findByPk(devolucion.detalleId, { transaction });
      if (!detalle) continue;
      const cantidadADevolver = devolucion.cantidadDevolver || 0;
      if (cantidadADevolver <= 0) continue;
      const pendiente = detalle.cantidad - detalle.cantidadDevuelta;
      if (cantidadADevolver > pendiente) continue;
      const nuevaCantidadDevuelta = detalle.cantidadDevuelta + cantidadADevolver;
      await detalle.update({
        cantidadDevuelta: nuevaCantidadDevuelta, fechaUltimaDevolucion: new Date(),
        estadoDevolucion: devolucion.estadoDevolucion || 'disponible',
        condicionDevolucion: devolucion.condicionDevolucion,
        fotosDevolucion: JSON.stringify(fotosMap[devolucion.detalleId] || []),
        observacionesDevolucion: devolucion.observaciones
      }, { transaction });
      const mueble = await Mobiliario.findByPk(detalle.mobiliarioId, { transaction });
      if (mueble) {
        const estadoDev = devolucion.estadoDevolucion || 'disponible';
        const stockAnterior = mueble.stockActual;
        if (estadoDev === 'disponible') {
          const stockNuevo = stockAnterior + cantidadADevolver;
          await mueble.update({ stockActual: stockNuevo }, { transaction });
          await MovimientoMobiliario.create({
            mobiliarioId: detalle.mobiliarioId, tipoMovimiento: 'devolucion' as any,
            cantidad: cantidadADevolver, stockAnterior, stockNuevo, motivo: 'devolucion',
            descripcion: `Devuelto de ${acta.nombreReceptor} - ${cantidadADevolver} ${mueble.unidadMedida || 'und.'} restauradas al stock`,
            actaEntregaId: acta.id, fecha: new Date(), Uid
          }, { transaction });
        } else {
          await MovimientoMobiliario.create({
            mobiliarioId: detalle.mobiliarioId, tipoMovimiento: 'devolucion' as any,
            cantidad: cantidadADevolver, stockAnterior, stockNuevo: stockAnterior, motivo: 'devolucion',
            descripcion: `Devuelto de ${acta.nombreReceptor} - ${cantidadADevolver} ${mueble.unidadMedida || 'und.'} marcadas como ${estadoDev}`,
            actaEntregaId: acta.id, fecha: new Date(), Uid
          }, { transaction });
        }
      }
    }
    const detallesActualizados = await DetalleActaMobiliario.findAll({ where: { actaMobiliarioId: acta.id }, transaction });
    const todosDevueltos = detallesActualizados.every((d: any) => d.cantidadDevuelta >= d.cantidad);
    const algunoDevuelto = detallesActualizados.some((d: any) => d.cantidadDevuelta > 0);
    let nuevoEstado = acta.estado;
    if (todosDevueltos) nuevoEstado = 'devuelta_completa';
    else if (algunoDevuelto) nuevoEstado = 'devuelta_parcial';
    await acta.update({ estado: nuevoEstado, observacionesDevolucion, fechaDevolucionReal: todosDevueltos ? new Date() : null }, { transaction });
    await transaction.commit();
    const actaActualizada = await ActaMobiliario.findByPk(Number(id), {
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario' }] }]
    });
    try { const io = getIO(); io.to('actas-mobiliario').emit('actaMobiliario:returned', { actaId: acta.id }); } catch (e) {}
    res.json({ msg: todosDevueltos ? 'Devolucion completa registrada' : 'Devolucion parcial registrada', acta: actaActualizada });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar devolucion de mobiliario:', error);
    res.status(500).json({ msg: 'Error al registrar la devolucion' });
  }
};

export const obtenerActasMobiliarioActivas = async (req: Request, res: Response) => {
  try {
    const actas = await ActaMobiliario.findAll({
      where: { estado: { [Op.in]: ['activa', 'devuelta_parcial'] } },
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario', attributes: ['id', 'nombre', 'categoria', 'unidadMedida'] }] }],
      order: [['fechaEntrega', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas activas de mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener actas activas' });
  }
};

export const obtenerHistorialMobiliarioActas = async (req: Request, res: Response) => {
  try {
    const { mobiliarioId } = req.params;
    const historial = await DetalleActaMobiliario.findAll({
      where: { mobiliarioId },
      include: [{ model: ActaMobiliario, as: 'acta', attributes: ['id', 'numeroActa', 'nombreReceptor', 'cargoReceptor', 'fechaEntrega', 'estado'] }],
      order: [[{ model: ActaMobiliario, as: 'acta' }, 'fechaEntrega', 'DESC']]
    });
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial de mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

export const cancelarActaMobiliario = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { Uid } = req.body;
    const acta = await ActaMobiliario.findByPk(Number(id), {
      include: [{ model: DetalleActaMobiliario, as: 'detalles', include: [{ model: Mobiliario, as: 'mobiliario' }] }],
      transaction
    });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (acta.estado === 'cancelada') { await transaction.rollback(); res.status(400).json({ msg: 'Esta acta ya esta cancelada' }); return; }
    const estadoAnterior = acta.estado;
    for (const detalle of (acta as any).detalles || []) {
      const mueble = detalle.mobiliario;
      if (!mueble) continue;
      if (estadoAnterior === 'pendiente_firma') {
        await MovimientoMobiliario.create({
          mobiliarioId: mueble.id, tipoMovimiento: 'cancelacion' as any,
          cantidad: detalle.cantidad, stockAnterior: mueble.stockActual, stockNuevo: mueble.stockActual,
          motivo: 'cancelacion_acta',
          descripcion: `Cancelacion de Acta ${acta.numeroActa} - Reserva de ${detalle.cantidad} ${mueble.unidadMedida || 'und.'} liberada`,
          actaEntregaId: acta.id, fecha: new Date(), Uid
        }, { transaction });
      } else if (['activa', 'devuelta_parcial', 'vencida'].includes(estadoAnterior)) {
        const cantidadPendiente = detalle.cantidad - (detalle.cantidadDevuelta || 0);
        if (cantidadPendiente <= 0) continue;
        const stockAnterior = mueble.stockActual;
        const stockNuevo = stockAnterior + cantidadPendiente;
        await Mobiliario.update({ stockActual: stockNuevo }, { where: { id: mueble.id }, transaction });
        await MovimientoMobiliario.create({
          mobiliarioId: mueble.id, tipoMovimiento: 'cancelacion' as any,
          cantidad: cantidadPendiente, stockAnterior, stockNuevo, motivo: 'cancelacion_acta',
          descripcion: `Cancelacion post-firma de Acta ${acta.numeroActa} - Restaurado ${cantidadPendiente} ${mueble.unidadMedida || 'und.'}`,
          actaEntregaId: acta.id, fecha: new Date(), Uid
        }, { transaction });
      }
    }
    await TokenFirmaMobiliario.update({ estado: 'cancelado' }, { where: { actaMobiliarioId: acta.id, estado: 'pendiente' }, transaction });
    await acta.update({ estado: 'cancelada' }, { transaction });
    await transaction.commit();
    try { const io = getIO(); io.to('actas-mobiliario').emit('actaMobiliario:cancelled', { actaId: acta.id }); } catch (e) {}
    res.json({ msg: 'Acta cancelada exitosamente. El inventario ha sido restaurado.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al cancelar acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al cancelar el acta' });
  }
};

export const eliminarActaMobiliario = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const acta = await ActaMobiliario.findByPk(Number(id), { transaction });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (!['cancelada', 'rechazada'].includes(acta.estado)) {
      await transaction.rollback(); res.status(400).json({ msg: 'Solo se pueden eliminar actas canceladas o rechazadas' }); return;
    }
    await TokenFirmaMobiliario.destroy({ where: { actaMobiliarioId: acta.id }, transaction });
    await DetalleActaMobiliario.destroy({ where: { actaMobiliarioId: acta.id }, transaction });
    await acta.destroy({ transaction });
    await transaction.commit();
    try { const io = getIO(); io.to('actas-mobiliario').emit('actaMobiliario:deleted', { actaId: Number(id) }); } catch (e) {}
    res.json({ msg: 'Acta eliminada permanentemente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al eliminar el acta' });
  }
};
