import { Request, Response } from 'express';
import crypto from 'crypto';
import { RegistroAsistencia, ParticipanteAsistencia } from '../models/asistencia';
import { User } from '../models/user';
import { sendAsistenciaEmail } from '../utils/mailer';
import { generarActaPDF } from '../services/asistenciaPdf';
import { parseId } from '../utils/parseId';

// Crear un nuevo registro de asistencia
export const crearRegistroAsistencia = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fecha, tema, facilitadorId, participantesIds, participantesExternos } = req.body;

    // Validaciones
    const tieneInternos = participantesIds && participantesIds.length > 0;
    const tieneExternos = participantesExternos && participantesExternos.length > 0;

    if (!fecha || !tema || !facilitadorId || (!tieneInternos && !tieneExternos)) {
      return res.status(400).json({
        msg: 'Fecha, tema, facilitador y al menos un participante son requeridos',
      });
    }

    // Obtener datos del facilitador
    const facilitador = await User.findByPk(parseId(facilitadorId));
    if (!facilitador) {
      return res.status(404).json({ msg: 'Facilitador no encontrado' });
    }

    // Crear el registro principal
    const registro = await RegistroAsistencia.create({
      fecha,
      tema,
      facilitadorId,
      facilitadorNombre: `${facilitador.name} ${facilitador.lastName}`,
      codigo: 'GH-FOR-046',
      version: '03',
      estado: 'pendiente',
    });

    // Obtener datos de los participantes internos y crear registros
    const participantesCreados = [];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    if (tieneInternos) {
      const participantes = await User.findAll({
        where: { Uid: participantesIds },
      });

      for (const usuario of participantes) {
        const tokenFirma = crypto.randomBytes(32).toString('hex');

        const participante = await ParticipanteAsistencia.create({
          registroId: registro.id,
          usuarioId: usuario.Uid,
          nombreCompleto: `${usuario.name} ${usuario.lastName}`,
          documentoIdentificacion: usuario.documentoIdentificacion || '',
          cargo: usuario.cargo || '',
          empresa: usuario.empresa || 'AP',
          email: usuario.email,
          tokenFirma,
          firmado: false,
          esExterno: false,
        });

        participantesCreados.push(participante);

        // Enviar correo con enlace de firma
        const enlaceFirma = `${frontendUrl}/firmar-asistencia/${tokenFirma}`;

        try {
          await sendAsistenciaEmail(
            usuario.email,
            `${usuario.name} ${usuario.lastName}`,
            {
              fecha,
              tema,
              facilitador: `${facilitador.name} ${facilitador.lastName}`,
              enlaceFirma,
            }
          );
        } catch (emailError) {
          console.error(`Error enviando correo a ${usuario.email}:`, emailError);
        }
      }
    }

    // Crear participantes externos (sin enviar correo)
    if (tieneExternos) {
      for (const externo of participantesExternos) {
        const tokenFirma = crypto.randomBytes(32).toString('hex');

        const participante = await ParticipanteAsistencia.create({
          registroId: registro.id,
          usuarioId: null,
          nombreCompleto: externo.nombreCompleto,
          documentoIdentificacion: externo.documentoIdentificacion || '',
          cargo: externo.cargo || '',
          empresa: externo.empresa || 'EXTERNO',
          email: externo.email || '',
          tokenFirma,
          firmado: true,
          esExterno: true,
        });

        participantesCreados.push(participante);
      }
    }

    // Actualizar estado a en_proceso
    await registro.update({ estado: 'en_proceso' });

    res.status(201).json({
      msg: 'Registro de asistencia creado exitosamente',
      registro: {
        ...registro.toJSON(),
        participantes: participantesCreados,
      },
    });
  } catch (error: any) {
    console.error('Error al crear registro de asistencia:', error);
    res.status(500).json({
      msg: 'Error al crear registro de asistencia',
      error: error.message,
    });
  }
};

// Obtener información para firmar (público, sin auth)
export const obtenerInfoFirma = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;

    const participante = await ParticipanteAsistencia.findOne({
      where: { tokenFirma: token },
      include: [
        {
          model: RegistroAsistencia,
          as: 'registro',
        },
      ],
    });

    if (!participante) {
      return res.status(404).json({ msg: 'Token inválido o expirado' });
    }

    if (participante.cancelado) {
      return res.status(400).json({ msg: 'Este enlace de firma ha sido cancelado', tipo: 'cancelado' });
    }

    if (participante.anulado) {
      return res.status(400).json({ msg: 'La firma de este participante ha sido anulada', tipo: 'anulado' });
    }

    if (participante.firmado) {
      return res.status(400).json({ msg: 'Este registro ya ha sido firmado' });
    }

    const registro = (participante as any).registro;

    res.json({
      participante: {
        id: participante.id,
        nombreCompleto: participante.nombreCompleto,
        documentoIdentificacion: participante.documentoIdentificacion,
        cargo: participante.cargo,
        empresa: participante.empresa,
      },
      registro: {
        fecha: registro.fecha,
        tema: registro.tema,
        facilitadorNombre: registro.facilitadorNombre,
        codigo: registro.codigo,
        version: registro.version,
      },
    });
  } catch (error: any) {
    console.error('Error al obtener info de firma:', error);
    res.status(500).json({
      msg: 'Error al obtener información',
      error: error.message,
    });
  }
};

// Firmar registro (público, sin auth)
export const firmarAsistencia = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;
    const { firma } = req.body; // Base64 de la imagen de firma

    if (!firma) {
      return res.status(400).json({ msg: 'La firma es requerida' });
    }

    const participante = await ParticipanteAsistencia.findOne({
      where: { tokenFirma: token },
      include: [{ model: RegistroAsistencia, as: 'registro' }],
    });

    if (!participante) {
      return res.status(404).json({ msg: 'Token inválido o expirado' });
    }

    if (participante.cancelado) {
      return res.status(400).json({ msg: 'Este enlace de firma ha sido cancelado', tipo: 'cancelado' });
    }

    if (participante.anulado) {
      return res.status(400).json({ msg: 'La firma de este participante ha sido anulada', tipo: 'anulado' });
    }

    if (participante.firmado) {
      return res.status(400).json({ msg: 'Este registro ya ha sido firmado' });
    }

    // Guardar la firma
    await participante.update({
      firma,
      fechaFirma: new Date(),
      firmado: true,
    });

    // Verificar si todos los participantes activos han firmado (excluir cancelados)
    const registro = (participante as any).registro;
    const totalParticipantes = await ParticipanteAsistencia.count({
      where: { registroId: registro.id, cancelado: false },
    });
    const firmados = await ParticipanteAsistencia.count({
      where: { registroId: registro.id, firmado: true, cancelado: false, anulado: false },
    });

    if (firmados === totalParticipantes) {
      await RegistroAsistencia.update(
        { estado: 'completado' },
        { where: { id: registro.id } }
      );
    }

    res.json({
      msg: 'Firma registrada exitosamente',
      firmados,
      totalParticipantes,
    });
  } catch (error: any) {
    console.error('Error al firmar:', error);
    res.status(500).json({
      msg: 'Error al registrar la firma',
      error: error.message,
    });
  }
};

// Obtener todos los registros de asistencia
export const obtenerRegistros = async (req: Request, res: Response): Promise<any> => {
  try {
    const registros = await RegistroAsistencia.findAll({
      include: [
        {
          model: ParticipanteAsistencia,
          as: 'participantes',
        },
        {
          model: User,
          as: 'facilitador',
          attributes: ['Uid', 'name', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(registros);
  } catch (error: any) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({
      msg: 'Error al obtener registros',
      error: error.message,
    });
  }
};

// Obtener un registro específico con sus participantes
export const obtenerRegistroPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const registro = await RegistroAsistencia.findByPk(parseId(id), {
      include: [
        {
          model: ParticipanteAsistencia,
          as: 'participantes',
        },
        {
          model: User,
          as: 'facilitador',
          attributes: ['Uid', 'name', 'lastName', 'email'],
        },
      ],
    });

    if (!registro) {
      return res.status(404).json({ msg: 'Registro no encontrado' });
    }

    res.json(registro);
  } catch (error: any) {
    console.error('Error al obtener registro:', error);
    res.status(500).json({
      msg: 'Error al obtener registro',
      error: error.message,
    });
  }
};

// Generar PDF del acta
export const generarPDF = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { empresa } = req.query; // AP, AT o ME

    if (!empresa) {
      return res.status(400).json({ msg: 'El parámetro empresa es requerido' });
    }

    const registro = await RegistroAsistencia.findByPk(parseId(id), {
      include: [
        {
          model: ParticipanteAsistencia,
          as: 'participantes',
          where: { empresa: empresa as string },
          required: false,
        },
      ],
    });

    if (!registro) {
      return res.status(404).json({ msg: 'Registro no encontrado' });
    }

    const participantes = (registro as any).participantes || [];
    
    if (participantes.length === 0) {
      return res.status(404).json({ 
        msg: `No hay participantes de la empresa ${empresa} en este registro` 
      });
    }

    const pdfBuffer = await generarActaPDF(registro, participantes, empresa as string);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=acta_asistencia_${empresa}_${registro.id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({
      msg: 'Error al generar PDF',
      error: error.message,
    });
  }
};

// Reenviar correo de firma a un participante
export const reenviarCorreoFirma = async (req: Request, res: Response): Promise<any> => {
  try {
    const { participanteId } = req.params;

    const participante = await ParticipanteAsistencia.findByPk(parseId(participanteId), {
      include: [{ model: RegistroAsistencia, as: 'registro' }],
    });

    if (!participante) {
      return res.status(404).json({ msg: 'Participante no encontrado' });
    }

    if ((participante as any).esExterno) {
      return res.status(400).json({ msg: 'No se puede reenviar correo a un participante externo' });
    }

    if (participante.firmado) {
      return res.status(400).json({ msg: 'Este participante ya firmó' });
    }

    const registro = (participante as any).registro;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const enlaceFirma = `${frontendUrl}/firmar-asistencia/${participante.tokenFirma}`;

    await sendAsistenciaEmail(
      participante.email,
      participante.nombreCompleto,
      {
        fecha: registro.fecha,
        tema: registro.tema,
        facilitador: registro.facilitadorNombre,
        enlaceFirma,
      }
    );

    res.json({ msg: 'Correo reenviado exitosamente' });
  } catch (error: any) {
    console.error('Error al reenviar correo:', error);
    res.status(500).json({
      msg: 'Error al reenviar correo',
      error: error.message,
    });
  }
};

// Eliminar registro de asistencia
export const eliminarRegistro = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const registro = await RegistroAsistencia.findByPk(parseId(id));
    if (!registro) {
      return res.status(404).json({ msg: 'Registro no encontrado' });
    }

    // Eliminar participantes primero
    await ParticipanteAsistencia.destroy({ where: { registroId: id } });

    // Eliminar registro
    await registro.destroy();

    res.json({ msg: 'Registro eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar registro:', error);
    res.status(500).json({
      msg: 'Error al eliminar registro',
      error: error.message,
    });
  }
};

// Cancelar token de firma de un participante (antes de firmar)
export const cancelarTokenFirma = async (req: Request, res: Response): Promise<any> => {
  try {
    const { participanteId } = req.params;
    const { motivo } = req.body;

    const participante = await ParticipanteAsistencia.findByPk(parseId(participanteId), {
      include: [{ model: RegistroAsistencia, as: 'registro' }],
    });

    if (!participante) {
      return res.status(404).json({ msg: 'Participante no encontrado' });
    }

    if (participante.esExterno) {
      return res.status(400).json({ msg: 'No se puede cancelar la firma de un participante externo' });
    }

    if (participante.cancelado) {
      return res.status(400).json({ msg: 'Este participante ya está cancelado' });
    }

    if (participante.firmado) {
      return res.status(400).json({ msg: 'Este participante ya firmó. Use la opción de anular firma.' });
    }

    await participante.update({
      cancelado: true,
      fechaCancelacion: new Date(),
      motivoCancelacion: motivo || null,
    });

    // Recalcular estado del registro
    const registro = (participante as any).registro;
    const totalActivos = await ParticipanteAsistencia.count({
      where: { registroId: registro.id, cancelado: false },
    });
    const firmadosActivos = await ParticipanteAsistencia.count({
      where: { registroId: registro.id, firmado: true, cancelado: false, anulado: false },
    });

    if (totalActivos > 0 && firmadosActivos === totalActivos) {
      await registro.update({ estado: 'completado' });
    }

    res.json({ msg: 'Token de firma cancelado exitosamente' });
  } catch (error: any) {
    console.error('Error al cancelar token:', error);
    res.status(500).json({
      msg: 'Error al cancelar token de firma',
      error: error.message,
    });
  }
};

// Anular firma de un participante (después de firmar)
export const anularFirma = async (req: Request, res: Response): Promise<any> => {
  try {
    const { participanteId } = req.params;
    const { motivo } = req.body;

    const participante = await ParticipanteAsistencia.findByPk(parseId(participanteId), {
      include: [{ model: RegistroAsistencia, as: 'registro' }],
    });

    if (!participante) {
      return res.status(404).json({ msg: 'Participante no encontrado' });
    }

    if (!participante.firmado) {
      return res.status(400).json({ msg: 'Este participante no ha firmado aún' });
    }

    if (participante.anulado) {
      return res.status(400).json({ msg: 'La firma de este participante ya fue anulada' });
    }

    await participante.update({
      anulado: true,
      firma: null,
      firmado: false,
      fechaCancelacion: new Date(),
      motivoCancelacion: motivo || null,
    });

    // Recalcular estado del registro
    const registro = (participante as any).registro;
    if (registro.estado === 'completado') {
      await registro.update({ estado: 'en_proceso' });
    }

    res.json({ msg: 'Firma anulada exitosamente' });
  } catch (error: any) {
    console.error('Error al anular firma:', error);
    res.status(500).json({
      msg: 'Error al anular firma',
      error: error.message,
    });
  }
};

