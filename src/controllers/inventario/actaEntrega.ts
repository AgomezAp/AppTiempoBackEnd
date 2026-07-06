import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeInventario from '../../database/connection-inventario';
import {
  Dispositivo, ActaEntrega, DetalleActa, TokenFirma,
  ActaDevolucion, MovimientoDispositivo, DetalleDevolucion, TokenDevolucion
} from '../../models/inventario/dispositivo';
import { getIO } from '../../services/websocket.service';
import { getPhotoUrl } from '../../config/inventario-multer';

// ── Helper ───────────────────────────────────────────────────────────────────
const generarNumeroActa = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const ultimaActa = await ActaEntrega.findOne({
    where: { numeroActa: { [Op.like]: `ACTA-${year}-%` } },
    order: [['id', 'DESC']]
  });
  let numero = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    numero = parseInt(partes[2]) + 1;
  }
  return `ACTA-${year}-${numero.toString().padStart(4, '0')}`;
};

// ── Controllers ──────────────────────────────────────────────────────────────

export const obtenerActas = async (req: Request, res: Response) => {
  try {
    const { estado, busqueda, limite } = req.query;
    let where: any = {};
    if (estado && estado !== 'todas') where.estado = estado;
    if (busqueda) {
      where[Op.or] = [
        { numeroActa: { [Op.iLike]: `%${busqueda}%` } },
        { nombreReceptor: { [Op.iLike]: `%${busqueda}%` } },
        { cargoReceptor: { [Op.iLike]: `%${busqueda}%` } },
        { cedulaReceptor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }

    const customLimit = limite ? parseInt(limite as string) : 200; // Máximo 200 actas por default

    const actas = await ActaEntrega.findAll({
      where,
      limit: customLimit,
      include: [{
        model: DetalleActa,
        as: 'detalles',
        include: [{ model: Dispositivo, as: 'dispositivo', attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'imei'] }]
      }],
      order: [['fechaEntrega', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas:', error);
    res.status(500).json({ msg: 'Error al obtener las actas' });
  }
};

export const obtenerActaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [{
        model: DetalleActa,
        as: 'detalles',
        include: [{ model: Dispositivo, as: 'dispositivo' }]
      }]
    });
    if (!acta) { res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    res.json(acta);
  } catch (error) {
    console.error('Error al obtener acta:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

export const crearActaEntrega = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const {
      nombreReceptor, cedulaReceptor, cargoReceptor, correoReceptor,
      observacionesEntrega, dispositivos: dispositivosRaw, Uid
    } = req.body;

    let dispositivos = dispositivosRaw;
    if (typeof dispositivosRaw === 'string') {
      try { dispositivos = JSON.parse(dispositivosRaw); }
      catch (e) { await transaction.rollback(); res.status(400).json({ msg: 'Formato de dispositivos inválido' }); return; }
    }

    if (!dispositivos || !Array.isArray(dispositivos) || dispositivos.length === 0) {
      await transaction.rollback(); res.status(400).json({ msg: 'Debe seleccionar al menos un dispositivo' }); return;
    }

    // Obtener y validar dispositivos (CON BLOQUEO para evitar doble asignacion concurrente)
    const dispositivosIds = dispositivos.map((d: any) => d.dispositivoId);
    const dispositivosDB = await Dispositivo.findAll({ 
      where: { id: dispositivosIds }, 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });

    // Calcular reservas pendientes para dispositivos de stock
    const stockDispositivos = dispositivosDB.filter(d => d.tipoRegistro === 'stock');
    let stockReservado: { [id: number]: number } = {};

    if (stockDispositivos.length > 0) {
      const stockIds = stockDispositivos.map(d => d.id);
      const detallesPendientes = await DetalleActa.findAll({
        where: { dispositivoId: stockIds },
        include: [{ model: ActaEntrega, as: 'acta', where: { estado: 'pendiente_firma' }, attributes: ['id'] }],
        attributes: ['dispositivoId', 'cantidad'],
        transaction
      });
      const movimientosReserva = await MovimientoDispositivo.findAll({
        where: { dispositivoId: stockIds, tipoMovimiento: 'reserva' as any },
        attributes: ['dispositivoId'],
        transaction
      });
      const reservaSet = new Set(movimientosReserva.map((m: any) => m.dispositivoId));
      for (const det of detallesPendientes) {
        const did = (det as any).dispositivoId;
        if (reservaSet.has(did)) {
          stockReservado[did] = (stockReservado[did] || 0) + ((det as any).cantidad || 1);
        }
      }
    }

    // Validar disponibilidad
    const noDisponibles: string[] = [];
    for (const item of dispositivos) {
      const dispositivo = dispositivosDB.find(d => d.id === item.dispositivoId);
      if (!dispositivo) { noDisponibles.push(`Dispositivo ID ${item.dispositivoId} no encontrado`); continue; }
      const cantidad = item.cantidad || 1;
      if (dispositivo.tipoRegistro === 'stock') {
        const disponible = (dispositivo.stockActual || 0) - (stockReservado[dispositivo.id] || 0);
        if (disponible < cantidad) {
          noDisponibles.push(`${dispositivo.nombre}: necesita ${cantidad}, disponible ${disponible}`);
        }
      } else {
        if (dispositivo.estado !== 'disponible') {
          noDisponibles.push(`${dispositivo.nombre} (${dispositivo.serial || 'S/N'}) no está disponible: ${dispositivo.estado}`);
        }
      }
    }
    if (noDisponibles.length > 0) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Algunos dispositivos no están disponibles', dispositivos: noDisponibles });
      return;
    }

    // Generar número de acta
    const numeroActa = await generarNumeroActa();

    // Procesar fotos
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const dispositivoId = file.fieldname.replace('fotos_', '');
        if (!fotosMap[dispositivoId]) fotosMap[dispositivoId] = [];
        fotosMap[dispositivoId].push(getPhotoUrl(file.filename, 'entregas'));
      }
    }

    // Crear acta
    const acta = await ActaEntrega.create({
      numeroActa, nombreReceptor, cedulaReceptor, cargoReceptor, correoReceptor,
      observacionesEntrega, fechaEntrega: new Date(), estado: 'pendiente_firma', Uid
    }, { transaction });

    // Crear detalles y registrar reservas (SIN reducir el stock todavía)
    for (const item of dispositivos) {
      const dispositivo = dispositivosDB.find(d => d.id === item.dispositivoId);
      if (!dispositivo) continue;

      const cantidad = item.cantidad || 1;
      const fotosEntregaItem = fotosMap[item.dispositivoId] ? JSON.stringify(fotosMap[item.dispositivoId]) : JSON.stringify([]);

      await DetalleActa.create({
        actaId: acta.id,
        dispositivoId: item.dispositivoId,
        cantidad,
        condicionEntrega: item.condicion || dispositivo.condicion || 'bueno',
        fotosEntrega: fotosEntregaItem,
        devuelto: false
      }, { transaction });

      if (dispositivo.tipoRegistro === 'stock') {
        // MODELO NUEVO: Reserva sin reducir stock
        await MovimientoDispositivo.create({
          dispositivoId: item.dispositivoId,
          tipoMovimiento: 'reserva' as any,
          estadoAnterior: `stock: ${dispositivo.stockActual}`,
          estadoNuevo: `stock: ${dispositivo.stockActual}`,
          descripcion: `Reservado para ${nombreReceptor} (${cargoReceptor}) - ${cantidad} und. - Acta ${numeroActa} pendiente firma`,
          actaId: acta.id,
          fecha: new Date(),
          Uid
        }, { transaction });
      } else {
        // Individual: cambiar estado a 'reservado'
        await dispositivo.update({ estado: 'reservado' }, { transaction });
        await MovimientoDispositivo.create({
          dispositivoId: item.dispositivoId,
          tipoMovimiento: 'reserva' as any,
          estadoAnterior: 'disponible',
          estadoNuevo: 'reservado',
          descripcion: `Reservado para ${nombreReceptor} - Acta ${numeroActa} pendiente firma`,
          actaId: acta.id,
          fecha: new Date(),
          Uid
        }, { transaction });
      }
    }

    await transaction.commit();

    const actaCompleta = await ActaEntrega.findByPk(acta.id, {
      include: [{
        model: DetalleActa,
        as: 'detalles',
        include: [{ model: Dispositivo, as: 'dispositivo' }]
      }]
    });

    const io = getIO();
    io.to('actas').emit('acta:created', actaCompleta);

    res.status(201).json({ msg: 'Acta de entrega creada exitosamente', acta: actaCompleta });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear acta:', error);
    res.status(500).json({ msg: error.message || 'Error al crear el acta de entrega' });
  }
};

export const registrarDevolucion = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { devoluciones: devolucionesRaw, observaciones, Uid } = req.body;

    let devoluciones = devolucionesRaw;
    if (typeof devolucionesRaw === 'string') {
      try { devoluciones = JSON.parse(devolucionesRaw); }
      catch (e) { await transaction.rollback(); res.status(400).json({ msg: 'Formato de devoluciones inválido' }); return; }
    }

    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [{ model: DetalleActa, as: 'detalles' }],
      transaction
    });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (!['activa', 'devuelta_parcial'].includes(acta.estado)) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Solo se pueden procesar devoluciones de actas activas o con devolución parcial' });
      return;
    }

    for (const dev of devoluciones) {
      const detalle = await DetalleActa.findByPk(dev.detalleId, { transaction });
      if (!detalle || detalle.devuelto) continue;

      const dispositivo = await Dispositivo.findByPk(detalle.dispositivoId, { transaction });
      if (!dispositivo) continue;

      const estadoDevolucion = dev.estadoDevolucion || 'disponible';
      if (dispositivo.tipoRegistro === 'stock') {
        const cantidadDevuelta = dev.cantidad || detalle.cantidad;
        const stockAnterior = dispositivo.stockActual;
        if (estadoDevolucion === 'disponible') {
          const nuevoStock = stockAnterior + cantidadDevuelta;
          await dispositivo.update({ stockActual: nuevoStock }, { transaction });
          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId, tipoMovimiento: 'devolucion',
            estadoAnterior: `stock: ${stockAnterior}`, estadoNuevo: `stock: ${nuevoStock}`,
            descripcion: `Devolución de ${cantidadDevuelta} und. de ${acta.nombreReceptor}. ${observaciones || ''}`,
            actaId: acta.id, fecha: new Date(), Uid
          }, { transaction });
        } else {
          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId, tipoMovimiento: 'devolucion',
            estadoAnterior: `stock: ${stockAnterior}`, estadoNuevo: `${estadoDevolucion}`,
            descripcion: `Devolución de ${cantidadDevuelta} und. marcadas como ${estadoDevolucion}. ${observaciones || ''}`,
            actaId: acta.id, fecha: new Date(), Uid
          }, { transaction });
        }
      } else {
        let nuevoEstado = 'disponible';
        if (estadoDevolucion === 'dañado') nuevoEstado = 'dañado';
        if (estadoDevolucion === 'perdido') nuevoEstado = 'perdido';
        await dispositivo.update({ estado: nuevoEstado as any, condicion: dev.condicion || dispositivo.condicion }, { transaction });
        await MovimientoDispositivo.create({
          dispositivoId: detalle.dispositivoId, tipoMovimiento: 'devolucion',
          estadoAnterior: 'entregado', estadoNuevo: nuevoEstado,
          descripcion: `Devuelto por ${acta.nombreReceptor}. Estado: ${nuevoEstado}. ${observaciones || ''}`,
          actaId: acta.id, fecha: new Date(), Uid
        }, { transaction });
      }

      await detalle.update({ devuelto: true }, { transaction });
    }

    // Actualizar estado del acta
    const detallesActualizados = await DetalleActa.findAll({ where: { actaId: acta.id }, transaction });
    const todosDevueltos = detallesActualizados.every(d => d.devuelto);
    const algunoDevuelto = detallesActualizados.some(d => d.devuelto);
    const nuevoEstado = todosDevueltos ? 'completada' : (algunoDevuelto ? 'devuelta_parcial' : acta.estado);
    await acta.update({ estado: nuevoEstado }, { transaction });

    await transaction.commit();

    const actaCompleta = await ActaEntrega.findByPk(Number(id), {
      include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }]
    });

    const io = getIO();
    io.to('actas').emit('acta:updated', { actaId: acta.id, estado: nuevoEstado });

    res.json({ msg: todosDevueltos ? 'Devolución completa registrada' : 'Devolución parcial registrada', acta: actaCompleta });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar devolución:', error);
    res.status(500).json({ msg: 'Error al registrar la devolución' });
  }
};

export const obtenerActasActivas = async (req: Request, res: Response) => {
  try {
    const actas = await ActaEntrega.findAll({
      where: { estado: { [Op.in]: ['activa', 'devuelta_parcial'] } },
      include: [{
        model: DetalleActa,
        as: 'detalles',
        include: [{ model: Dispositivo, as: 'dispositivo', attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'imei', 'tipoRegistro', 'stockActual'] }]
      }],
      order: [['fechaEntrega', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas activas:', error);
    res.status(500).json({ msg: 'Error al obtener las actas activas' });
  }
};

export const obtenerHistorialDispositivo = async (req: Request, res: Response) => {
  try {
    const { dispositivoId } = req.params;
    const detalles = await DetalleActa.findAll({
      where: { dispositivoId },
      include: [{ model: ActaEntrega, as: 'acta', attributes: ['id', 'numeroActa', 'nombreReceptor', 'cargoReceptor', 'fechaEntrega', 'estado'] }],
      order: [[{ model: ActaEntrega, as: 'acta' }, 'fechaEntrega', 'DESC']]
    });
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

export const cancelarActaEntrega = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { Uid } = req.body;
    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [{ model: DetalleActa, as: 'detalles' }],
      transaction
    });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (!['pendiente_firma', 'activa'].includes(acta.estado)) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Solo se pueden cancelar actas pendientes de firma o activas' });
      return;
    }

    const detalles: any[] = (acta as any).detalles || [];
    for (const detalle of detalles) {
      const dispositivo = await Dispositivo.findByPk(detalle.dispositivoId, { transaction });
      if (!dispositivo) continue;
      if (dispositivo.tipoRegistro === 'stock') {
        if (acta.estado === 'activa') {
          const nuevoStock = (dispositivo.stockActual || 0) + (detalle.cantidad || 1);
          await dispositivo.update({ stockActual: nuevoStock }, { transaction });
          await MovimientoDispositivo.create({
            dispositivoId: dispositivo.id, tipoMovimiento: 'cancelacion',
            estadoAnterior: `stock: ${dispositivo.stockActual}`, estadoNuevo: `stock: ${nuevoStock}`,
            descripcion: `Cancelación post-firma Acta ${acta.numeroActa}&#x2F;stock restaurado`,
            actaId: acta.id, fecha: new Date(), Uid
          }, { transaction });
        }
        // Si pendiente_firma: reserva no redujo stock, solo registrar cancelación
        await MovimientoDispositivo.create({
          dispositivoId: dispositivo.id, tipoMovimiento: 'cancelacion',
          estadoAnterior: `stock: ${dispositivo.stockActual}`, estadoNuevo: `stock: ${dispositivo.stockActual}`,
          descripcion: `Cancelación de reserva Acta ${acta.numeroActa} para ${acta.nombreReceptor}`,
          actaId: acta.id, fecha: new Date(), Uid
        }, { transaction });
      } else {
        await dispositivo.update({ estado: 'disponible' }, { transaction });
        await MovimientoDispositivo.create({
          dispositivoId: dispositivo.id, tipoMovimiento: 'cancelacion',
          estadoAnterior: acta.estado === 'activa' ? 'entregado' : 'reservado', estadoNuevo: 'disponible',
          descripcion: `Cancelación de Acta ${acta.numeroActa} - dispositivo devuelto a disponible`,
          actaId: acta.id, fecha: new Date(), Uid
        }, { transaction });
      }
    }

    await TokenFirma.update({ estado: 'cancelado' }, { where: { actaId: acta.id, estado: 'pendiente' }, transaction });
    await acta.update({ estado: 'cancelada' }, { transaction });
    await transaction.commit();

    const io = getIO();
    io.to('actas').emit('acta:cancelled', { actaId: acta.id });

    res.json({ msg: 'Acta cancelada exitosamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al cancelar acta:', error);
    res.status(500).json({ msg: 'Error al cancelar el acta' });
  }
};
