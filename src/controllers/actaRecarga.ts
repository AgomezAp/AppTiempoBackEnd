import { Request, Response } from 'express';
import { Op } from 'sequelize';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import ActaRecarga from '../models/actaRecarga';
import ActaRecargaAcceso from '../models/actaRecargaAcceso';
import { User } from '../models/user';
import { sendActaRecargaCompletadaEmail } from '../utils/mailer';
import { parseId } from '../utils/parseId';

// Helper: crear transporter fresco con las variables de entorno actuales
function crearTransporter() {
  console.log('[EMAIL] Creando transporter con:', {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
  });
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Emails autorizados para el módulo de actas de recargas
const EMISOR_EMAIL = 'acastrillon.adsmanager@andrespublicidadtg.com';
const REVISOR_EMAIL = 'cburbano.adsmanager@andrespublicidadtg.com';
const EMAILS_AUTORIZADOS = [EMISOR_EMAIL, REVISOR_EMAIL];

// Helper para verificar acceso
async function verificarAcceso(userId: number): Promise<boolean> {
  try {
    const usuario = await User.findByPk(parseId(userId));
    if (!usuario) {
      console.log(`[verificarAcceso] Usuario con ID ${userId} no encontrado`);
      return false;
    }

    // Verificar si es admin por rol
    const userWithRole = await User.findByPk(parseId(userId), {
      include: [{ association: 'role' }],
    });
    if (userWithRole && (userWithRole as any)?.role?.Rname === 'Admin') {
      return true;
    }

    // Verificar por email autorizado
    const emailUsuario = (usuario as any).email?.toLowerCase()?.trim();
    console.log(`[verificarAcceso] Email del usuario: "${emailUsuario}"`);
    if (emailUsuario && EMAILS_AUTORIZADOS.some(e => e.toLowerCase().trim() === emailUsuario)) {
      console.log(`[verificarAcceso] Acceso concedido por email autorizado: ${emailUsuario}`);
      return true;
    }

    // Verificar en tabla de accesos (para usuarios adicionales)
    const acceso = await ActaRecargaAcceso.findOne({
      where: {
        usuarioId: userId,
        [Op.or]: [{ puedeVer: true }, { puedeEditar: true }]
      }
    });

    if (acceso) {
      console.log(`[verificarAcceso] Acceso concedido por tabla de accesos`);
      return true;
    }

    console.log(`[verificarAcceso] Sin acceso para usuario ${userId} (${emailUsuario})`);
    return false;
  } catch (error) {
    console.error('[verificarAcceso] Error:', error);
    return false;
  }
}

// Obtener todas las actas (con filtros opcionales)
export const getActas = async (req: Request, res: Response): Promise<any> => {
  try {
    const { anio, estado, page = 1, limit = 10 } = req.query;
    const userId = (req as any).userId;

    // Verificar acceso
    const tieneAcceso = await verificarAcceso(userId);
    if (!tieneAcceso) {
      return res.status(403).json({ msg: 'No tienes acceso a este módulo' });
    }

    const where: any = {};
    if (anio) where.anio = Number(anio);
    if (estado) where.estado = estado;

    const offset = (Number(page) - 1) * Number(limit);
    
    const { count, rows: actas } = await ActaRecarga.findAndCountAll({
      where,
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      actas,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error al obtener actas:', error);
    res.status(500).json({ msg: 'Error al obtener actas', error: error.message });
  }
};

// Obtener una acta por ID
export const getActaById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const tieneAcceso = await verificarAcceso(userId);
    if (!tieneAcceso) {
      return res.status(403).json({ msg: 'No tienes acceso a este módulo' });
    }

    const acta = await ActaRecarga.findByPk(parseId(id), {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    if (!acta) {
      return res.status(404).json({ msg: 'Acta no encontrada' });
    }

    res.status(200).json({ success: true, acta });
  } catch (error: any) {
    console.error('Error al obtener acta:', error);
    res.status(500).json({ msg: 'Error al obtener acta', error: error.message });
  }
};

// Crear nueva acta
export const crearActa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { periodoInicio, periodoFin, anio, totalRequeridoProyectado, totalIngresadoTarjetas, totalRecargadoGoogleAds, totalReportadoFormularios, firmaEmisor, firmaEmisorImagen, revisorId } = req.body;
    const emisorId = (req as any).userId;

    const tieneAcceso = await verificarAcceso(emisorId);
    if (!tieneAcceso) {
      return res.status(403).json({ msg: 'No tienes acceso a este módulo' });
    }

    // Verificar que el revisor existe
    const revisorUser = await User.findByPk(parseId(revisorId));
    if (!revisorUser) {
      return res.status(400).json({ msg: 'El revisor seleccionado no existe' });
    }

    const acta = await ActaRecarga.create({
      periodoInicio,
      periodoFin,
      anio,
      totalRequeridoProyectado: totalRequeridoProyectado || null,
      totalIngresadoTarjetas: totalIngresadoTarjetas || null,
      totalRecargadoGoogleAds: totalRecargadoGoogleAds || null,
      totalReportadoFormularios: totalReportadoFormularios || null,
      firmaEmisor: firmaEmisor || null,
      firmaRevisor: null,
      firmaEmisorImagen: firmaEmisorImagen || null,
      firmaRevisorImagen: null,
      fechaFirmaEmisor: (firmaEmisor || firmaEmisorImagen) ? new Date() : null,
      fechaFirmaRevisor: null,
      estado: 'borrador',
      emisorId,
      revisorId,
      tokenFirma: null,
      tokenExpiracion: null,
    });

    const actaCompleta = await ActaRecarga.findByPk(parseId(acta.id), {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(201).json({ success: true, msg: 'Acta creada exitosamente', acta: actaCompleta });
  } catch (error: any) {
    console.error('Error al crear acta:', error);
    res.status(500).json({ msg: 'Error al crear acta', error: error.message });
  }
};

// Actualizar acta (solo si está en borrador)
export const actualizarActa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { periodoInicio, periodoFin, anio, totalRequeridoProyectado, totalIngresadoTarjetas, totalRecargadoGoogleAds, totalReportadoFormularios, firmaEmisor, firmaEmisorImagen, revisorId } = req.body;
    const userId = (req as any).userId;

    const acta = await ActaRecarga.findByPk(parseId(id));
    if (!acta) {
      return res.status(404).json({ msg: 'Acta no encontrada' });
    }

    // Solo el emisor puede editar y solo en estado borrador
    if (acta.emisorId !== userId) {
      return res.status(403).json({ msg: 'Solo el emisor puede editar el acta' });
    }

    if (acta.estado !== 'borrador') {
      return res.status(400).json({ msg: 'El acta ya no puede ser editada' });
    }

    await acta.update({
      periodoInicio: periodoInicio || acta.periodoInicio,
      periodoFin: periodoFin || acta.periodoFin,
      anio: anio || acta.anio,
      totalRequeridoProyectado: totalRequeridoProyectado !== undefined ? totalRequeridoProyectado : acta.totalRequeridoProyectado,
      totalIngresadoTarjetas: totalIngresadoTarjetas !== undefined ? totalIngresadoTarjetas : acta.totalIngresadoTarjetas,
      totalRecargadoGoogleAds: totalRecargadoGoogleAds !== undefined ? totalRecargadoGoogleAds : acta.totalRecargadoGoogleAds,
      totalReportadoFormularios: totalReportadoFormularios !== undefined ? totalReportadoFormularios : acta.totalReportadoFormularios,
      firmaEmisor: firmaEmisor !== undefined ? firmaEmisor : acta.firmaEmisor,
      firmaEmisorImagen: firmaEmisorImagen !== undefined ? firmaEmisorImagen : acta.firmaEmisorImagen,
      fechaFirmaEmisor: (firmaEmisor !== undefined || firmaEmisorImagen !== undefined) ? new Date() : acta.fechaFirmaEmisor,
      revisorId: revisorId || acta.revisorId,
    });

    const actaActualizada = await ActaRecarga.findByPk(parseId(id), {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(200).json({ success: true, msg: 'Acta actualizada', acta: actaActualizada });
  } catch (error: any) {
    console.error('Error al actualizar acta:', error);
    res.status(500).json({ msg: 'Error al actualizar acta', error: error.message });
  }
};

// ==================== TEST DE EMAIL ====================
export const testEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const destinatario = (req.query.email as string) || REVISOR_EMAIL;
    console.log('========== TEST EMAIL ==========');
    console.log('[testEmail] Destinatario:', destinatario);
    console.log('[testEmail] EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('[testEmail] EMAIL_USER:', process.env.EMAIL_USER);
    console.log('[testEmail] FRONTEND_URL:', process.env.FRONTEND_URL);

    const transporter = crearTransporter();

    // Verificar conexión SMTP
    await transporter.verify();
    console.log('[testEmail] SMTP verificado OK');

    // Enviar email de prueba
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: destinatario,
      subject: '✅ Test de Email - Actas de Recargas',
      html: `<h2>Email de prueba</h2><p>Si recibes esto, el sistema de correos funciona correctamente.</p><p>Fecha: ${new Date().toLocaleString('es-CO')}</p>`,
    });

    console.log('[testEmail] Email enviado OK:', info.messageId);
    console.log('========== FIN TEST EMAIL ==========');

    res.status(200).json({
      success: true,
      msg: `Email de prueba enviado a ${destinatario}`,
      messageId: info.messageId,
      envVars: {
        EMAIL_SERVICE: process.env.EMAIL_SERVICE,
        EMAIL_USER: process.env.EMAIL_USER,
        FRONTEND_URL: process.env.FRONTEND_URL,
      },
    });
  } catch (error: any) {
    console.error('[testEmail] ERROR:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al enviar email de prueba',
      error: error.message,
      envVars: {
        EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'NO DEFINIDO',
        EMAIL_USER: process.env.EMAIL_USER || 'NO DEFINIDO',
      },
    });
  }
};

// Enviar acta para revisión (emisor firma y envía)
export const enviarActaParaRevision = async (req: Request, res: Response): Promise<any> => {
  console.log('\n========== ENVIAR ACTA PARA REVISION ==========');
  try {
    const { id } = req.params;
    const { firmaEmisor, firmaEmisorImagen } = req.body;
    const userId = (req as any).userId;
    console.log('[enviarActa] Paso 1 - userId:', userId, '| actaId:', id);

    // Buscar el acta con emisor y revisor
    const acta = await ActaRecarga.findByPk(parseId(id), {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    if (!acta) {
      console.log('[enviarActa] ERROR: Acta no encontrada');
      return res.status(404).json({ msg: 'Acta no encontrada' });
    }
    console.log('[enviarActa] Paso 2 - Acta encontrada, emisorId:', acta.emisorId, '| revisorId:', acta.revisorId);

    // Verificar que sea el emisor O un admin
    const esEmisor = Number(acta.emisorId) === Number(userId);
    const tieneAcceso = await verificarAcceso(Number(userId));
    console.log('[enviarActa] Paso 3 - esEmisor:', esEmisor, '| tieneAcceso:', tieneAcceso);
    if (!esEmisor && !tieneAcceso) {
      return res.status(403).json({ msg: 'No tienes permiso para enviar esta acta' });
    }

    // Verificar firma
    console.log('[enviarActa] Paso 4 - firmaEmisor:', !!firmaEmisor, '| firmaEmisorImagen:', !!firmaEmisorImagen);
    if (!firmaEmisor && !firmaEmisorImagen) {
      return res.status(400).json({ msg: 'Debe firmar el acta antes de enviar' });
    }

    // Generar token para firma del revisor
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiracion = new Date();
    tokenExpiracion.setDate(tokenExpiracion.getDate() + 7);

    // Actualizar el acta
    await acta.update({
      firmaEmisor: firmaEmisor || acta.firmaEmisor,
      firmaEmisorImagen: firmaEmisorImagen || acta.firmaEmisorImagen,
      fechaFirmaEmisor: new Date(),
      estado: 'pendiente_revision',
      tokenFirma: token,
      tokenExpiracion,
    });
    console.log('[enviarActa] Paso 5 - Acta actualizada a pendiente_revision');

    // === ENVIAR EMAIL DIRECTAMENTE (sin dependencias externas) ===
    const revisor = (acta as any).revisor;
    const emisor = (acta as any).emisor;
    const emailRevisor = revisor?.email || REVISOR_EMAIL;
    const nombreRevisor = revisor ? `${revisor.name || ''} ${revisor.lastName || ''}`.trim() : 'Revisor';
    const nombreEmisor = emisor ? `${emisor.name || ''} ${emisor.lastName || ''}`.trim() : 'Emisor';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const enlaceFirma = `${frontendUrl}/firmar-acta/${token}`;

    const formatMoney = (amount: number | null | undefined) => {
      if (amount === null || amount === undefined) return '—';
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(Number(amount));
    };

    console.log('[enviarActa] Paso 6 - Email destino:', emailRevisor);
    console.log('[enviarActa] Paso 6 - Enlace firma:', enlaceFirma);
    console.log('[enviarActa] Paso 6 - EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('[enviarActa] Paso 6 - EMAIL_USER:', process.env.EMAIL_USER);

    try {
      // Crear transporter fresco directamente aquí
      const transporter = crearTransporter();

      // Verificar SMTP
      await transporter.verify();
      console.log('[enviarActa] Paso 7 - SMTP verificado OK');

      // Construir HTML del email
      const htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: #141414; padding: 20px; text-align: center;">
            <h1 style="color: #FFD600; margin: 0; font-size: 20px;">📋 Acta de Validación y Cierre de Recargas</h1>
            <p style="color: #fff; margin: 5px 0 0; font-size: 13px;">Pendiente de Revisión y Firma</p>
          </div>
          <div style="padding: 25px;">
            <p>Hola <strong>${nombreRevisor}</strong>,</p>
            <p><strong>${nombreEmisor}</strong> ha enviado un Acta de Validación y Cierre de Recargas que requiere tu revisión y firma.</p>
            <div style="background: #f9f9f9; border-left: 4px solid #FFD600; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
              <h3 style="margin: 0 0 10px; color: #141414;">📋 Detalles del Acta</h3>
              <p><strong>Periodo:</strong> ${acta.periodoInicio} al ${acta.periodoFin} de ${acta.anio}</p>
              <p><strong>Total Requerido Proyectado:</strong> ${formatMoney(acta.totalRequeridoProyectado)}</p>
              <p><strong>Total Ingresado Tarjetas:</strong> ${formatMoney(acta.totalIngresadoTarjetas)}</p>
              <p><strong>Total Recargado Google ADS:</strong> ${formatMoney(acta.totalRecargadoGoogleAds)}</p>
              <p><strong>Total Reportado Formularios:</strong> ${formatMoney(acta.totalReportadoFormularios)}</p>
              <p><strong>Enviado por:</strong> ${nombreEmisor}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${enlaceFirma}" style="display: inline-block; background: #141414; color: #FFD600; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">✍️ REVISAR Y FIRMAR ACTA</a>
            </div>
            <div style="background: #FFF3CD; border: 1px solid #FFD600; border-radius: 6px; padding: 12px; margin: 15px 0; font-size: 13px; color: #856404;">
              <strong>⚠️ Importante:</strong> Este enlace expira en 7 días.
            </div>
            <p style="font-size: 12px; color: #888;">Enlace directo: <a href="${enlaceFirma}">${enlaceFirma}</a></p>
          </div>
          <div style="background: #141414; padding: 15px; text-align: center;">
            <p style="color: #fff; margin: 0; font-size: 12px;">Sistema de Actas - <span style="color: #FFD600; font-weight: bold;">Andrés Publicidad</span></p>
          </div>
        </div>
      `;

      // Enviar email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailRevisor,
        subject: `📋 Acta de Validación de Recargas - Pendiente de Firma`,
        html: htmlEmail,
      });

      console.log('[enviarActa] Paso 8 - ✅ EMAIL ENVIADO OK:', info.messageId, 'a:', emailRevisor);
    } catch (emailError: any) {
      console.error('[enviarActa] ❌ ERROR AL ENVIAR EMAIL:', emailError.message);
      console.error('[enviarActa] Stack:', emailError.stack);
    }

    // Devolver respuesta
    const actaActualizada = await ActaRecarga.findByPk(parseId(id), {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    console.log('========== FIN ENVIAR ACTA ==========\n');
    res.status(200).json({
      success: true,
      msg: 'Acta enviada para revisión. Se ha notificado al revisor por correo.',
      acta: actaActualizada,
    });
  } catch (error: any) {
    console.error('[enviarActa] ERROR GENERAL:', error);
    res.status(500).json({ msg: 'Error al enviar acta', error: error.message });
  }
};

// Obtener información del acta por token (para firmar)
export const getActaByToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;

    const acta = await ActaRecarga.findOne({
      where: {
        tokenFirma: token,
        tokenExpiracion: { [Op.gt]: new Date() },
      },
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    if (!acta) {
      return res.status(404).json({ msg: 'Token inválido o expirado' });
    }

    if (acta.estado === 'completado') {
      return res.status(400).json({ msg: 'Esta acta ya ha sido completada' });
    }

    res.status(200).json({ success: true, acta });
  } catch (error: any) {
    console.error('Error al obtener acta por token:', error);
    res.status(500).json({ msg: 'Error al obtener acta', error: error.message });
  }
};

// Firmar acta como revisor (completar el acta)
export const firmarActaRevisor = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;
    const { firmaRevisor, firmaRevisorImagen } = req.body;

    const acta = await ActaRecarga.findOne({
      where: {
        tokenFirma: token,
        tokenExpiracion: { [Op.gt]: new Date() },
      },
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    if (!acta) {
      return res.status(404).json({ msg: 'Token inválido o expirado' });
    }

    if (acta.estado === 'completado') {
      return res.status(400).json({ msg: 'Esta acta ya ha sido completada' });
    }

    if (!firmaRevisor && !firmaRevisorImagen) {
      return res.status(400).json({ msg: 'Debe firmar el acta (nombre o imagen de firma)' });
    }

    await acta.update({
      firmaRevisor: firmaRevisor || acta.firmaRevisor,
      firmaRevisorImagen: firmaRevisorImagen || acta.firmaRevisorImagen,
      fechaFirmaRevisor: new Date(),
      estado: 'completado',
      tokenFirma: null,
      tokenExpiracion: null,
    });

    // Notificar al emisor que el acta fue completada
    const emisor = acta.emisor as any;
    if (emisor && emisor.email) {
      await sendActaRecargaCompletadaEmail(emisor.email, {
        nombreEmisor: `${emisor.name} ${emisor.lastName}`,
        nombreRevisor: `${(acta.revisor as any).name} ${(acta.revisor as any).lastName}`,
        periodoInicio: acta.periodoInicio,
        periodoFin: acta.periodoFin,
        anio: acta.anio,
        totalRequeridoProyectado: acta.totalRequeridoProyectado,
        totalIngresadoTarjetas: acta.totalIngresadoTarjetas,
        totalRecargadoGoogleAds: acta.totalRecargadoGoogleAds,
        totalReportadoFormularios: acta.totalReportadoFormularios,
        actaId: acta.id,
      });
    }

    const actaActualizada = await ActaRecarga.findByPk(acta.id, {
      include: [
        { model: User, as: 'emisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
        { model: User, as: 'revisor', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(200).json({ 
      success: true, 
      msg: 'Acta firmada y completada exitosamente',
      acta: actaActualizada 
    });
  } catch (error: any) {
    console.error('Error al firmar acta:', error);
    res.status(500).json({ msg: 'Error al firmar acta', error: error.message });
  }
};

// Eliminar acta (solo si está en borrador)
export const eliminarActa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const acta = await ActaRecarga.findByPk(id);
    if (!acta) {
      return res.status(404).json({ msg: 'Acta no encontrada' });
    }

    if (acta.emisorId !== userId) {
      return res.status(403).json({ msg: 'Solo el emisor puede eliminar el acta' });
    }

    if (acta.estado !== 'borrador') {
      return res.status(400).json({ msg: 'Solo se pueden eliminar actas en estado borrador' });
    }

    await acta.destroy();

    res.status(200).json({ success: true, msg: 'Acta eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar acta:', error);
    res.status(500).json({ msg: 'Error al eliminar acta', error: error.message });
  }
};

// ==================== GESTIÓN DE ACCESOS ====================

// Obtener usuarios con acceso
export const getUsuariosConAcceso = async (req: Request, res: Response): Promise<any> => {
  try {
    const accesos = await ActaRecargaAcceso.findAll({
      include: [
        { model: User, as: 'usuario', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(200).json({ success: true, accesos });
  } catch (error: any) {
    console.error('Error al obtener accesos:', error);
    res.status(500).json({ msg: 'Error al obtener accesos', error: error.message });
  }
};

// Agregar acceso a usuario
export const agregarAcceso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuarioId, puedeVer = true, puedeEditar = false } = req.body;

    // Verificar que el usuario existe
    const usuario = await User.findByPk(parseId(usuarioId));
    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Verificar si ya tiene acceso
    const accesoExistente = await ActaRecargaAcceso.findOne({ where: { usuarioId } });
    if (accesoExistente) {
      return res.status(400).json({ msg: 'El usuario ya tiene acceso configurado' });
    }

    const acceso = await ActaRecargaAcceso.create({
      usuarioId,
      puedeVer,
      puedeEditar,
    });

    const accesoCompleto = await ActaRecargaAcceso.findByPk(parseId(acceso.id), {
      include: [
        { model: User, as: 'usuario', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(201).json({ success: true, msg: 'Acceso agregado', acceso: accesoCompleto });
  } catch (error: any) {
    console.error('Error al agregar acceso:', error);
    res.status(500).json({ msg: 'Error al agregar acceso', error: error.message });
  }
};

// Actualizar acceso
export const actualizarAcceso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { puedeVer, puedeEditar } = req.body;

    const acceso = await ActaRecargaAcceso.findByPk(id);
    if (!acceso) {
      return res.status(404).json({ msg: 'Acceso no encontrado' });
    }

    await acceso.update({
      puedeVer: puedeVer !== undefined ? puedeVer : acceso.puedeVer,
      puedeEditar: puedeEditar !== undefined ? puedeEditar : acceso.puedeEditar,
    });

    const accesoActualizado = await ActaRecargaAcceso.findByPk(parseId(id), {
      include: [
        { model: User, as: 'usuario', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    res.status(200).json({ success: true, msg: 'Acceso actualizado', acceso: accesoActualizado });
  } catch (error: any) {
    console.error('Error al actualizar acceso:', error);
    res.status(500).json({ msg: 'Error al actualizar acceso', error: error.message });
  }
};

// Eliminar acceso
export const eliminarAcceso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const acceso = await ActaRecargaAcceso.findByPk(id);
    if (!acceso) {
      return res.status(404).json({ msg: 'Acceso no encontrado' });
    }

    await acceso.destroy();

    res.status(200).json({ success: true, msg: 'Acceso eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar acceso:', error);
    res.status(500).json({ msg: 'Error al eliminar acceso', error: error.message });
  }
};

// Verificar si el usuario actual tiene acceso al módulo
export const verificarMiAcceso = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    // Admin siempre tiene acceso
    if (userRole === 'Admin') {
      return res.status(200).json({ 
        success: true, 
        tieneAcceso: true, 
        puedeVer: true, 
        puedeEditar: true,
        esAdmin: true 
      });
    }

    // Verificar por email autorizado
    const usuario = await User.findByPk(userId);
    if (!usuario) {
      return res.status(200).json({ 
        success: true, 
        tieneAcceso: false, 
        puedeVer: false, 
        puedeEditar: false,
        esAdmin: false 
      });
    }

    const emailUsuario = usuario.email.toLowerCase();
    const esEmisor = emailUsuario === EMISOR_EMAIL.toLowerCase();
    const esRevisor = emailUsuario === REVISOR_EMAIL.toLowerCase();

    if (esEmisor || esRevisor) {
      return res.status(200).json({ 
        success: true, 
        tieneAcceso: true,
        puedeVer: true,
        puedeEditar: esEmisor, // Solo el emisor puede editar/crear
        esAdmin: false,
        esEmisor,
        esRevisor,
      });
    }

    // Si no es autorizado, verificar tabla de accesos (para usuarios adicionales agregados por admin)
    const acceso = await ActaRecargaAcceso.findOne({ where: { usuarioId: userId } });
    
    if (!acceso) {
      return res.status(200).json({ 
        success: true, 
        tieneAcceso: false, 
        puedeVer: false, 
        puedeEditar: false,
        esAdmin: false 
      });
    }

    res.status(200).json({ 
      success: true, 
      tieneAcceso: acceso.puedeVer || acceso.puedeEditar,
      puedeVer: acceso.puedeVer,
      puedeEditar: acceso.puedeEditar,
      esAdmin: false
    });
  } catch (error: any) {
    console.error('Error al verificar acceso:', error);
    res.status(500).json({ msg: 'Error al verificar acceso', error: error.message });
  }
};

// Obtener usuarios disponibles para asignar como revisor
export const getUsuariosDisponibles = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;

    // El revisor por defecto es cburbano
    const revisor = await User.findOne({ 
      where: { email: REVISOR_EMAIL },
      attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'],
    });

    const usuarios: any[] = [];
    if (revisor && revisor.Uid !== userId) {
      usuarios.push(revisor);
    }

    // También incluir usuarios de la tabla de accesos (excepto el actual)
    const accesos = await ActaRecargaAcceso.findAll({
      where: {
        usuarioId: { [Op.ne]: userId },
      },
      include: [
        { model: User, as: 'usuario', attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'] },
      ],
    });

    accesos.forEach(a => {
      if (a.usuario && !usuarios.some((u: any) => u.Uid === (a.usuario as any).Uid)) {
        usuarios.push(a.usuario);
      }
    });

    // También incluir al emisor si el usuario actual no es el emisor
    const emisor = await User.findOne({
      where: { email: EMISOR_EMAIL },
      attributes: ['Uid', 'name', 'lastName', 'email', 'cargo'],
    });
    if (emisor && emisor.Uid !== userId && !usuarios.some((u: any) => u.Uid === emisor.Uid)) {
      usuarios.push(emisor);
    }

    res.status(200).json({ success: true, usuarios });
  } catch (error: any) {
    console.error('Error al obtener usuarios disponibles:', error);
    res.status(500).json({ msg: 'Error al obtener usuarios', error: error.message });
  }
};
