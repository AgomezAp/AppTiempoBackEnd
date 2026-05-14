import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';
import { TokenFirma, ActaEntrega, DetalleActa, Dispositivo, MovimientoDispositivo } from '../../models/inventario/dispositivo';
import { enviarCorreoFirma, enviarActaFirmada, enviarNotificacionRechazo } from '../../config/inventario-email';
import { getIO } from '../../services/websocket.service';

export const enviarSolicitudFirma = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  console.log('📧 [enviarSolicitudFirma] Iniciando proceso...');
  console.log('   Acta ID:', req.params.id);
  try {
    const { id } = req.params;
    const { correoNotificacion } = req.body;
    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }],
      transaction
    });
    if (!acta) { console.log('   ❌ Acta no encontrada'); await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
    console.log('   Acta encontrada:', acta.numeroActa);
    console.log('   Correo receptor:', acta.correoReceptor);
    if (!acta.correoReceptor) {
      console.log('   ❌ Acta sin correo de receptor');
      await transaction.rollback(); res.status(400).json({ msg: 'El acta no tiene correo de receptor' }); return;
    }
    await TokenFirma.update({ estado: 'cancelado' }, { where: { actaId: acta.id, estado: 'pendiente' }, transaction });
    const token = uuidv4();
    console.log('   Token generado:', token.substring(0, 8) + '...');
    await TokenFirma.create({
      token, actaId: acta.id, correoReceptor: acta.correoReceptor,
      estado: 'pendiente', fechaEnvio: new Date()
    }, { transaction });
    console.log('   Token guardado en BD');
    await acta.update({ estado: 'pendiente_firma' }, { transaction });
    const dispositivos = (acta as any).detalles?.map((d: any) => ({
      tipo: d.dispositivo?.categoria || 'Dispositivo',
      marca: d.dispositivo?.marca || '',
      modelo: d.dispositivo?.modelo || '',
      serial: d.dispositivo?.serial || 'N/A',
      nombre: d.dispositivo?.nombre
    })) || [];
    console.log('   Dispositivos preparados:', dispositivos.length);
    console.log('   Enviando correo...');
    await enviarCorreoFirma(acta.correoReceptor, acta.nombreReceptor, token, dispositivos, acta.observacionesEntrega);
    console.log('   ✅ Correo enviado, haciendo commit...');
    await transaction.commit();
    console.log('   ✅ Proceso completado exitosamente');
    res.json({ msg: 'Solicitud de firma enviada correctamente', correo: acta.correoReceptor });
  } catch (error: any) {
    await transaction.rollback();
    console.error('❌ Error al enviar solicitud de firma:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ msg: error.message || 'Error al enviar la solicitud de firma' });
  }
};

export const obtenerActaPorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const tokenFirma = await TokenFirma.findOne({
      where: { token },
      include: [{
        model: ActaEntrega,
        as: 'acta',
        include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo', attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'descripcion'] }] }]
      }]
    });
    if (!tokenFirma) { res.status(404).json({ msg: 'Token inválido o no encontrado' }); return; }
    if (tokenFirma.estado === 'firmado') { res.status(400).json({ msg: 'Este acta ya ha sido firmada', fechaFirma: tokenFirma.fechaFirma }); return; }
    if (tokenFirma.estado === 'cancelado') { res.status(400).json({ msg: 'Este enlace ha sido cancelado. Solicite un nuevo enlace.' }); return; }
    if (tokenFirma.estado === 'rechazado') { res.status(400).json({ msg: 'Este acta fue devuelta para corrección', motivo: tokenFirma.motivoRechazo }); return; }
    const acta = (tokenFirma as any).acta;
    const datosActa = {
      numeroActa: acta?.numeroActa, nombreReceptor: acta?.nombreReceptor,
      cargoReceptor: acta?.cargoReceptor, correoReceptor: acta?.correoReceptor,
      fechaEntrega: acta?.fechaEntrega, observaciones: acta?.observacionesEntrega,
      dispositivos: acta?.detalles?.map((d: any) => ({
        nombre: d.dispositivo?.nombre, categoria: d.dispositivo?.categoria,
        marca: d.dispositivo?.marca, modelo: d.dispositivo?.modelo,
        serial: d.dispositivo?.serial, descripcion: d.dispositivo?.descripcion,
        condicion: d.condicionEntrega
      })) || []
    };
    res.json(datosActa);
  } catch (error) {
    console.error('Error al obtener acta por token:', error);
    res.status(500).json({ msg: 'Error al obtener los datos del acta' });
  }
};

export const firmarActaConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { token } = req.params;
    const { firma, correosNotificacion } = req.body;
    if (!firma) { await transaction.rollback(); res.status(400).json({ msg: 'La firma es requerida' }); return; }
    const tokenFirma = await TokenFirma.findOne({
      where: { token },
      include: [{ model: ActaEntrega, as: 'acta', include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }] }],
      transaction
    });
    if (!tokenFirma) { await transaction.rollback(); res.status(404).json({ msg: 'Token inválido' }); return; }
    if (tokenFirma.estado !== 'pendiente') { await transaction.rollback(); res.status(400).json({ msg: `Este token ya no es válido. Estado: ${tokenFirma.estado}` }); return; }
    const acta = (tokenFirma as any).acta;
    const ahora = new Date();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await tokenFirma.update({ estado: 'firmado', fechaFirma: ahora, ipFirma: ip, userAgent: userAgent.substring(0, 500) }, { transaction });
    await ActaEntrega.update({ firmaReceptor: firma, estado: 'activa', fechaFirma: ahora }, { where: { id: acta.id }, transaction });
    for (const detalle of acta.detalles) {
      const dispositivo = detalle.dispositivo;
      const cantidadEntregada = detalle.cantidad || 1;
      if (dispositivo.tipoRegistro === 'stock') {
        const tieneReserva = await MovimientoDispositivo.findOne({
          where: { dispositivoId: detalle.dispositivoId, actaId: acta.id, tipoMovimiento: 'reserva' as any },
          transaction
        });
        if (tieneReserva) {
          const nuevoStock = Math.max(0, (dispositivo.stockActual || 0) - cantidadEntregada);
          await Dispositivo.update({ stockActual: nuevoStock }, { where: { id: detalle.dispositivoId }, transaction });
          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId, tipoMovimiento: 'firma_entrega' as any,
            estadoAnterior: `stock: ${dispositivo.stockActual}`, estadoNuevo: `stock: ${nuevoStock}`,
            descripcion: `Confirmado por firma digital de ${acta.nombreReceptor} - ${acta.numeroActa} (${cantidadEntregada} und.) - Stock reducido`,
            actaId: acta.id, fecha: ahora
          }, { transaction });
        } else {
          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId, tipoMovimiento: 'firma_entrega' as any,
            estadoAnterior: `stock: ${dispositivo.stockActual}`, estadoNuevo: `stock: ${dispositivo.stockActual}`,
            descripcion: `Confirmado por firma digital de ${acta.nombreReceptor} - ${acta.numeroActa} (${cantidadEntregada} und.)`,
            actaId: acta.id, fecha: ahora
          }, { transaction });
        }
      } else {
        await Dispositivo.update({ estado: 'entregado' }, { where: { id: detalle.dispositivoId }, transaction });
        await MovimientoDispositivo.create({
          dispositivoId: detalle.dispositivoId, tipoMovimiento: 'firma_entrega',
          estadoAnterior: 'disponible', estadoNuevo: 'entregado',
          descripcion: `Acta firmada digitalmente por ${acta.nombreReceptor} - ${acta.numeroActa}`,
          actaId: acta.id, fecha: ahora
        }, { transaction });
      }
    }
    await transaction.commit();
    const io = getIO();
    const dispositivosIds = acta.detalles.map((d: any) => d.dispositivoId);
    io.to('actas').emit('acta:signed', { actaId: acta.id, estado: 'activa' });
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivosIds });
    try {
      const dispositivos = acta.detalles?.map((d: any) => ({
        tipo: d.dispositivo?.categoria || 'Dispositivo', marca: d.dispositivo?.marca || '',
        modelo: d.dispositivo?.modelo || '', serial: d.dispositivo?.serial || 'N/A'
      })) || [];
      const destinatarios = [acta.correoReceptor];
      if (correosNotificacion && Array.isArray(correosNotificacion)) destinatarios.push(...correosNotificacion);
      await enviarActaFirmada(destinatarios, acta.nombreReceptor, dispositivos, ahora);
    } catch (emailError) { console.error('Error enviando confirmación por correo:', emailError); }
    res.json({ msg: 'Acta firmada exitosamente', fechaFirma: ahora });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al firmar acta:', error);
    res.status(500).json({ msg: 'Error al procesar la firma' });
  }
};

export const rechazarActaConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { token } = req.params;
    const { motivo, correoNotificacion } = req.body;
    if (!motivo || motivo.trim().length === 0) { await transaction.rollback(); res.status(400).json({ msg: 'Debe indicar el motivo del rechazo' }); return; }
    const tokenFirma = await TokenFirma.findOne({
      where: { token },
      include: [{ model: ActaEntrega, as: 'acta', include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }] }],
      transaction
    });
    if (!tokenFirma) { await transaction.rollback(); res.status(404).json({ msg: 'Token inválido' }); return; }
    if (tokenFirma.estado !== 'pendiente') { await transaction.rollback(); res.status(400).json({ msg: 'Este enlace ya no es válido' }); return; }
    const acta = (tokenFirma as any).acta;
    await tokenFirma.update({ estado: 'rechazado', motivoRechazo: motivo }, { transaction });
    if (acta?.detalles) {
      for (const detalle of acta.detalles) {
        const dispositivo = detalle.dispositivo;
        if (!dispositivo) continue;
        if (dispositivo.tipoRegistro !== 'stock') {
          await Dispositivo.update({ estado: 'disponible' }, { where: { id: detalle.dispositivoId }, transaction });
        }
      }
    }
    await ActaEntrega.update({ estado: 'rechazada', observacionesDevolucion: `Rechazada por el receptor: ${motivo}` }, { where: { id: acta.id }, transaction });
    await transaction.commit();
    const io = getIO();
    io.to('actas').emit('acta:rejected', { actaId: acta.id, estado: 'rechazada', motivo });
    try {
      if (correoNotificacion) await enviarNotificacionRechazo(correoNotificacion, acta.nombreReceptor, motivo);
    } catch (emailError) { console.error('Error enviando notificación de rechazo:', emailError); }
    res.json({ msg: 'Acta devuelta para corrección', motivo });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al rechazar acta:', error);
    res.status(500).json({ msg: 'Error al procesar el rechazo' });
  }
};

export const reenviarCorreoFirma = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelizeInventario.transaction();
  try {
    const { id } = req.params;

    // Buscar token pendiente existente
    let tokenFirma = await TokenFirma.findOne({
      where: { actaId: Number(id), estado: 'pendiente' },
      include: [{ model: ActaEntrega, as: 'acta', include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }] }],
      transaction
    });

    let acta: any;
    let token: string;

    if (!tokenFirma) {
      // No hay token pendiente: el envío inicial falló sin crear token.
      // Crear uno nuevo igual que enviarSolicitudFirma.
      acta = await ActaEntrega.findByPk(Number(id), {
        include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo' }] }],
        transaction
      });
      if (!acta) { await transaction.rollback(); res.status(404).json({ msg: 'Acta no encontrada' }); return; }
      if (!acta.correoReceptor) { await transaction.rollback(); res.status(400).json({ msg: 'El acta no tiene correo de receptor' }); return; }
      if (!['pendiente_firma', 'rechazada'].includes(acta.estado)) {
        await transaction.rollback();
        res.status(400).json({ msg: `No se puede reenviar el correo para un acta en estado "${acta.estado}"` });
        return;
      }

      token = uuidv4();
      await TokenFirma.create({
        token, actaId: acta.id, correoReceptor: acta.correoReceptor,
        estado: 'pendiente', fechaEnvio: new Date()
      }, { transaction });
      await acta.update({ estado: 'pendiente_firma' }, { transaction });
    } else {
      acta = (tokenFirma as any).acta;
      token = tokenFirma.token;
      await tokenFirma.update({ fechaEnvio: new Date() }, { transaction });
    }

    const dispositivos = acta?.detalles?.map((d: any) => ({
      tipo: d.dispositivo?.categoria || 'Dispositivo', marca: d.dispositivo?.marca || '',
      modelo: d.dispositivo?.modelo || '', serial: d.dispositivo?.serial || 'N/A'
    })) || [];

    await enviarCorreoFirma(acta.correoReceptor, acta.nombreReceptor, token, dispositivos, acta.observacionesEntrega);
    await transaction.commit();
    res.json({ msg: 'Correo reenviado correctamente', correo: acta.correoReceptor });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al reenviar correo:', error);
    res.status(500).json({ msg: error.message || 'Error al reenviar el correo' });
  }
};

export const obtenerEstadoFirma = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tokens = await TokenFirma.findAll({ where: { actaId: Number(id) }, order: [['fechaEnvio', 'DESC']] });
    const tokenActivo = tokens.find(t => t.estado === 'pendiente');
    const tokenFirmado = tokens.find(t => t.estado === 'firmado');
    const tokenRechazado = tokens.find(t => t.estado === 'rechazado');
    res.json({
      tieneTokenPendiente: !!tokenActivo, firmado: !!tokenFirmado, rechazado: !!tokenRechazado,
      tokenActivo: tokenActivo ? { fechaEnvio: tokenActivo.fechaEnvio, correo: tokenActivo.correoReceptor } : null,
      fechaFirma: tokenFirmado?.fechaFirma, motivoRechazo: tokenRechazado?.motivoRechazo,
      historial: tokens.map(t => ({ estado: t.estado, fechaEnvio: t.fechaEnvio, fechaFirma: t.fechaFirma, correo: t.correoReceptor }))
    });
  } catch (error) {
    console.error('Error al obtener estado de firma:', error);
    res.status(500).json({ msg: 'Error al obtener el estado de firma' });
  }
};
