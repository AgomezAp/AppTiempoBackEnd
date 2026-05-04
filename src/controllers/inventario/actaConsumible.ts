import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeInventario from '../../database/connection-inventario';
import {
  ActaConsumible, DetalleActaConsumible, TokenFirmaConsumible,
  Consumible, MovimientoConsumible, TipoInventario
} from '../../models/inventario/consumibles';
import { UserMapping } from '../../models/inventario/userMapping';
import { getIO } from '../../services/websocket.service';
import { enviarCorreoFirmaConsumible } from '../../config/inventario-email';

// Resuelve el Uid de inventario_general a partir del Uid de horarios (api_inventario)
async function resolveInventarioUid(horariosUid: number | undefined): Promise<number | null> {
  if (!horariosUid) return null;
  try {
    const mapping = await UserMapping.findOne({ where: { horarios_uid: horariosUid } });
    return mapping ? mapping.inventario_uid : null;
  } catch {
    return null;
  }
}

const generarNumeroActa = async (tipoInventarioCodigo: string): Promise<string> => {
  const prefijo = tipoInventarioCodigo.toUpperCase();
  const año = new Date().getFullYear();
  const ultimaActa = await ActaConsumible.findOne({
    where: { numeroActa: { [Op.like]: `ACTA-${prefijo}-${año}-%` } },
    order: [['numeroActa', 'DESC']]
  });
  let siguiente = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    siguiente = parseInt(partes[partes.length - 1]) + 1;
  }
  return `ACTA-${prefijo}-${año}-${String(siguiente).padStart(4, '0')}`;
};

export const obtenerActasConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo, estado } = req.query;
    let where: any = {};
    if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
      if (tipo) where.tipoInventarioId = tipo.id;
    }
    if (estado) where.estado = estado;
    const actas = await ActaConsumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas de consumibles:', error);
    res.status(500).json({ msg: 'Error al obtener las actas' });
  }
};

export const obtenerActasPorTipo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const { estado } = req.query;
    const tipoInventario = await TipoInventario.findOne({ where: { codigo, activo: true } });
    if (!tipoInventario) { res.status(404).json({ msg: 'Tipo de inventario no encontrado' }); return; }
    let where: any = { tipoInventarioId: tipoInventario.id };
    if (estado) where.estado = estado;
    const actas = await ActaConsumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas por tipo:', error);
    res.status(500).json({ msg: 'Error al obtener las actas' });
  }
};

export const obtenerActaConsumiblePorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await ActaConsumible.findByPk(Number(id), {
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida', 'descripcion'] }] }
      ]
    });
    if (!acta) { res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    res.json(acta);
  } catch (error) {
    console.error('Error al obtener acta:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

export const crearActaConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipoInventarioCodigo, nombreReceptor, cedulaReceptor, cargoReceptor, areaReceptor, correoReceptor, observaciones, articulos, Uid } = req.body;
    const tipoInventario = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
    if (!tipoInventario) { res.status(400).json({ msg: 'Tipo de inventario no válido' }); return; }
    if (!articulos || articulos.length === 0) { res.status(400).json({ msg: 'Debe incluir al menos un artículo' }); return; }
    for (const art of articulos) {
      const consumible = await Consumible.findByPk(art.consumibleId);
      if (!consumible) { res.status(400).json({ msg: `Artículo con ID ${art.consumibleId} no encontrado` }); return; }
      if (consumible.stockActual < art.cantidad) {
        res.status(400).json({ msg: `Stock insuficiente para "${consumible.nombre}". Disponible: ${consumible.stockActual}, Solicitado: ${art.cantidad}` }); return;
      }
    }
    const inventarioUid = await resolveInventarioUid(Uid);
    const numeroActa = await generarNumeroActa(tipoInventarioCodigo);
    const acta = await ActaConsumible.create({
      numeroActa, tipoInventarioId: tipoInventario.id, nombreReceptor, cedulaReceptor,
      cargoReceptor, areaReceptor, correoReceptor, observaciones,
      estado: 'pendiente_firma', fechaEntrega: new Date(), Uid
    });
    for (const art of articulos) {
      const consumible = await Consumible.findByPk(art.consumibleId);
      if (!consumible) continue;
      await DetalleActaConsumible.create({
        actaConsumibleId: acta.id, consumibleId: art.consumibleId,
        cantidad: art.cantidad, unidadMedida: consumible.unidadMedida, observaciones: art.observaciones
      });
      const stockAnterior = consumible.stockActual;
      const stockNuevo = stockAnterior - art.cantidad;
      await consumible.update({ stockActual: stockNuevo });
      await MovimientoConsumible.create({
        consumibleId: art.consumibleId, tipoMovimiento: 'salida', cantidad: art.cantidad,
        stockAnterior, stockNuevo, motivo: 'entrega',
        descripcion: `Entrega por Acta ${numeroActa} a ${nombreReceptor}`,
        actaEntregaId: acta.id, fecha: new Date(), Uid: inventarioUid
      });
    }
    const token = uuidv4();
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 7);
    await TokenFirmaConsumible.create({ actaConsumibleId: acta.id, token, fechaExpiracion });
    if (correoReceptor) {
      try { await enviarCorreoFirmaConsumible(correoReceptor, nombreReceptor, numeroActa, token, tipoInventarioCodigo); }
      catch (emailError) { console.error('Error al enviar correo:', emailError); }
    }
    try { const io = getIO(); io.to('actas-consumibles').emit('acta:created', { acta, tipoInventarioCodigo }); } catch (e) {}
    const actaCompleta = await ActaConsumible.findByPk(acta.id, {
      include: [
        { model: TipoInventario, as: 'tipoInventario' },
        { model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible' }] }
      ]
    });
    res.status(201).json({ msg: 'Acta creada exitosamente', acta: actaCompleta, token });
  } catch (error) {
    console.error('Error al crear acta de consumibles:', error);
    res.status(500).json({ msg: 'Error al crear el acta' });
  }
};

export const obtenerActaConsumiblePorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const tokenFirma = await TokenFirmaConsumible.findOne({
      where: { token },
      include: [{ model: ActaConsumible, as: 'acta', include: [{ model: TipoInventario, as: 'tipoInventario' }, { model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible' }] }] }]
    });
    if (!tokenFirma) { res.status(404).json({ msg: 'Token no válido o expirado' }); return; }
    if (tokenFirma.usado) { res.status(400).json({ msg: 'Este enlace ya fue utilizado' }); return; }
    if (new Date() > tokenFirma.fechaExpiracion) { res.status(400).json({ msg: 'Este enlace ha expirado' }); return; }
    res.json((tokenFirma as any).acta);
  } catch (error) {
    console.error('Error al obtener acta por token:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

export const firmarActaConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { firma, cedulaReceptor } = req.body;
    if (!firma) { res.status(400).json({ msg: 'La firma es requerida' }); return; }
    const tokenFirma = await TokenFirmaConsumible.findOne({ where: { token }, include: [{ model: ActaConsumible, as: 'acta' }] });
    if (!tokenFirma) { res.status(404).json({ msg: 'Token no válido' }); return; }
    if (tokenFirma.usado) { res.status(400).json({ msg: 'Este enlace ya fue utilizado' }); return; }
    if (new Date() > tokenFirma.fechaExpiracion) { res.status(400).json({ msg: 'Este enlace ha expirado' }); return; }
    const acta = (tokenFirma as any).acta;
    if (!acta) { res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    await acta.update({ firmaReceptor: firma, cedulaReceptor: cedulaReceptor || acta.cedulaReceptor, fechaFirma: new Date(), estado: 'firmada' });
    await tokenFirma.update({ usado: true });
    try { const io = getIO(); io.to('actas-consumibles').emit('acta:signed', { actaId: acta.id }); } catch (e) {}
    res.json({ msg: 'Acta firmada exitosamente', acta });
  } catch (error) {
    console.error('Error al firmar acta:', error);
    res.status(500).json({ msg: 'Error al firmar el acta' });
  }
};

export const rechazarActaConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { motivoRechazo } = req.body;
    if (!motivoRechazo) { res.status(400).json({ msg: 'El motivo de rechazo es requerido' }); return; }
    const tokenFirma = await TokenFirmaConsumible.findOne({
      where: { token },
      include: [{ model: ActaConsumible, as: 'acta', include: [{ model: DetalleActaConsumible, as: 'detalles' }] }]
    });
    if (!tokenFirma || !(tokenFirma as any).acta) { res.status(404).json({ msg: 'Token no válido' }); return; }
    if (tokenFirma.usado) { res.status(400).json({ msg: 'Este enlace ya fue utilizado' }); return; }
    const acta = (tokenFirma as any).acta;
    for (const detalle of acta.detalles || []) {
      const consumible = await Consumible.findByPk(detalle.consumibleId);
      if (consumible) {
        const stockAnterior = consumible.stockActual;
        const stockNuevo = stockAnterior + detalle.cantidad;
        await consumible.update({ stockActual: stockNuevo });
        await MovimientoConsumible.create({
          consumibleId: detalle.consumibleId, tipoMovimiento: 'devolucion', cantidad: detalle.cantidad,
          stockAnterior, stockNuevo, motivo: 'rechazo_acta',
          descripcion: `Devolución por rechazo del Acta ${acta.numeroActa}. Motivo: ${motivoRechazo}`,
          actaEntregaId: acta.id, fecha: new Date()
        });
      }
    }
    await acta.update({ estado: 'rechazada', motivoRechazo });
    await tokenFirma.update({ usado: true });
    try { const io = getIO(); io.to('actas-consumibles').emit('acta:rejected', { actaId: acta.id, motivoRechazo }); } catch (e) {}
    res.json({ msg: 'Acta rechazada. El stock ha sido devuelto.', acta });
  } catch (error) {
    console.error('Error al rechazar acta:', error);
    res.status(500).json({ msg: 'Error al rechazar el acta' });
  }
};

export const obtenerEstadisticasActasConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo } = req.query;
    let where: any = {};
    if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({ where: { codigo: tipoInventarioCodigo, activo: true } });
      if (tipo) where.tipoInventarioId = tipo.id;
    }
    const total = await ActaConsumible.count({ where });
    const pendientes = await ActaConsumible.count({ where: { ...where, estado: 'pendiente_firma' } });
    const firmadas = await ActaConsumible.count({ where: { ...where, estado: 'firmada' } });
    const rechazadas = await ActaConsumible.count({ where: { ...where, estado: 'rechazada' } });
    res.json({ total, pendientes, firmadas, rechazadas });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener estadísticas' });
  }
};

export const reenviarCorreoFirmaConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await ActaConsumible.findByPk(Number(id), {
      include: [{ model: TipoInventario, as: 'tipoInventario' }, { model: TokenFirmaConsumible, as: 'tokenFirma' }]
    });
    if (!acta) { res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (acta.estado !== 'pendiente_firma') { res.status(400).json({ msg: 'El acta ya fue procesada' }); return; }
    let token = (acta as any).tokenFirma?.token;
    const tokenExpirado = (acta as any).tokenFirma?.fechaExpiracion && new Date() > new Date((acta as any).tokenFirma.fechaExpiracion);
    if (!token || tokenExpirado) {
      token = uuidv4();
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 7);
      if ((acta as any).tokenFirma) {
        await (acta as any).tokenFirma.update({ token, fechaExpiracion, usado: false });
      } else {
        await TokenFirmaConsumible.create({ actaConsumibleId: acta.id, token, fechaExpiracion });
      }
    }
    await enviarCorreoFirmaConsumible(acta.correoReceptor, acta.nombreReceptor, acta.numeroActa, token, (acta as any).tipoInventario?.codigo || 'consumible', true);
    res.json({ msg: 'Correo reenviado exitosamente' });
  } catch (error) {
    console.error('Error al reenviar correo:', error);
    res.status(500).json({ msg: 'Error al reenviar el correo' });
  }
};

export const cancelarActaConsumible = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const { Uid } = req.body;
    const inventarioUid = await resolveInventarioUid(Uid);
    const acta = await ActaConsumible.findByPk(Number(id), {
      include: [{ model: DetalleActaConsumible, as: 'detalles', include: [{ model: Consumible, as: 'consumible' }] }],
      transaction
    });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (acta.estado === 'cancelada') { await transaction.rollback(); res.status(400).json({ msg: 'Esta acta ya está cancelada' }); return; }
    if (acta.estado === 'rechazada') { await transaction.rollback(); res.status(400).json({ msg: 'No se puede cancelar un acta rechazada' }); return; }
    for (const detalle of (acta as any).detalles || []) {
      const consumible = detalle.consumible;
      if (!consumible) continue;
      const stockAnterior = consumible.stockActual;
      const stockNuevo = stockAnterior + detalle.cantidad;
      await Consumible.update({ stockActual: stockNuevo }, { where: { id: consumible.id }, transaction });
      await MovimientoConsumible.create({
        consumibleId: consumible.id, tipoMovimiento: 'devolucion', cantidad: detalle.cantidad,
        stockAnterior, stockNuevo, motivo: 'cancelacion_acta',
        descripcion: `Cancelación${acta.estado === 'firmada' ? ' post-firma' : ''} de Acta ${acta.numeroActa} - Stock restaurado`,
        actaEntregaId: acta.id, fecha: new Date(), Uid: inventarioUid
      }, { transaction });
    }
    await TokenFirmaConsumible.update({ usado: true }, { where: { actaConsumibleId: acta.id, usado: false }, transaction });
    await acta.update({ estado: 'cancelada' }, { transaction });
    await transaction.commit();
    try { const io = getIO(); io.to('actas-consumibles').emit('acta:cancelled', { actaId: acta.id }); } catch (e) {}
    res.json({ msg: 'Acta cancelada exitosamente. El stock ha sido restaurado.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al cancelar acta de consumibles:', error);
    res.status(500).json({ msg: 'Error al cancelar el acta' });
  }
};

export const eliminarActaConsumible = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;
    const acta = await ActaConsumible.findByPk(Number(id), { transaction });
    if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    if (!['cancelada', 'rechazada'].includes(acta.estado)) {
      await transaction.rollback(); res.status(400).json({ msg: 'Solo se pueden eliminar actas canceladas o rechazadas' }); return;
    }
    await TokenFirmaConsumible.destroy({ where: { actaConsumibleId: acta.id }, transaction });
    await DetalleActaConsumible.destroy({ where: { actaConsumibleId: acta.id }, transaction });
    await acta.destroy({ transaction });
    await transaction.commit();
    try { const io = getIO(); io.to('actas-consumibles').emit('acta:deleted', { actaId: Number(id) }); } catch (e) {}
    res.json({ msg: 'Acta eliminada permanentemente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar acta de consumibles:', error);
    res.status(500).json({ msg: 'Error al eliminar el acta' });
  }
};
