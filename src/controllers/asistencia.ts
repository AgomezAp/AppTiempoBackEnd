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
    const { fecha, tema, facilitadorId, participantesIds } = req.body;

    // Validaciones
    if (!fecha || !tema || !facilitadorId || !participantesIds || participantesIds.length === 0) {
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

    // Obtener datos de los participantes y crear registros
    const participantes = await User.findAll({
      where: { Uid: participantesIds },
    });

    const participantesCreados = [];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

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

    if (participante.firmado) {
      return res.status(400).json({ msg: 'Este registro ya ha sido firmado' });
    }

    // Guardar la firma
    await participante.update({
      firma,
      fechaFirma: new Date(),
      firmado: true,
    });

    // Verificar si todos los participantes han firmado
    const registro = (participante as any).registro;
    const totalParticipantes = await ParticipanteAsistencia.count({
      where: { registroId: registro.id },
    });
    const firmados = await ParticipanteAsistencia.count({
      where: { registroId: registro.id, firmado: true },
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

    if (!empresa || !['AP', 'AT', 'ME'].includes(empresa as string)) {
      return res.status(400).json({ msg: 'Empresa inválida. Use AP, AT o ME' });
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

