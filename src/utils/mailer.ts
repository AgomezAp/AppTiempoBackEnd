import nodemailer from "nodemailer";
import crypto from "crypto";

// Transporter lazy: se crea solo al primer uso, DESPUÉS de que dotenv.config() haya cargado las variables
let _transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    console.log('[mailer] Creando transporter con:', {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '***' : 'UNDEFINED',
    });
    _transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return _transporter;
}

export const sendMail = (
  to: string[],
  subject: string,
  text: string,
  attachments?: Buffer | Buffer[] | null
) => {
  const domain = process.env.EMAIL_SERVICE;
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;
  // const uniqueReferencesId = crypto.randomUUID();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to.join(","),
    subject: `[${crypto.randomUUID().substring(0, 8)}] ${subject}`,
    text,
    headers: {
      "Message-ID": messageId,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
      "X-Google-Thread-Id": crypto.randomUUID(),
    },
    references: undefined,
    attachments: undefined as any,
    inReplyTo: undefined,
  };
  if (attachments && attachments !== null) {
    const getFileType = (buffer: Buffer) => {
      const header = buffer.toString("hex", 0, 4).toUpperCase();
      if (header.startsWith("25504446"))
        return { ext: "pdf", mime: "application/pdf" };
      if (header.startsWith("FFD8FF"))
        return { ext: "jpg", mime: "image/jpeg" };
      if (header.startsWith("89504E47"))
        return { ext: "png", mime: "image/png" };
      return { ext: "pdf", mime: "application/pdf" };
    };
    if (Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((buffer, index) => {
        const fileTpye = getFileType(buffer);
        return {
          filename:
            index === 0
              ? `documento.${fileTpye.ext}`
              : `documento_${index + 1}.${fileTpye.ext}`,
          content: buffer,
          contentType: fileTpye.mime,
        };
      });
    } else {
      const fileTpye = getFileType(attachments);
      mailOptions.attachments = [
        {
          filename: `documento.${fileTpye.ext}`,
          content: attachments,
          contentType: fileTpye.mime,
        },
      ];
    }
  }
  return getTransporter().sendMail(mailOptions);
};

export const sendReservationEmail = async (
  to: string,
  userName: string,
  reservation: any,
  type: "confirmation" | "invitation" | "cancellation"
): Promise<void> => {
  const roomName = reservation.Room?.name || "Sala desconocida";
  // IMPORTANTE: No usar new Date('YYYY-MM-DD') porque interpreta como UTC
  // y en zonas horarias negativas (ej. Colombia UTC-5) se desplaza un día atrás.
  // Parseamos manualmente para crear la fecha en hora local.
  const [yearStr, monthStr, dayStr] = String(reservation.date).split('-');
  const localDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  const date = localDate.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const creatorName = `${reservation.User?.name || ""} ${
    reservation.User?.lastName || ""
  }`.trim();
  const reason = reservation.reason;

  let subject = "";
  let htmlBody = "";

  // Estilos base embebidos
  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #FFD600;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #FFD600;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #FFD600;
    `,
    detailItem: `
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 100px;
    `,
    detailValue: `
      color: #555555;
    `,
    highlight: `
      background-color: #FFD600;
      color: #141414;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    divider: `
      border: none;
      height: 1px;
      background-color: #eeeeee;
      margin: 20px 0;
    `,
    badge: `
      display: inline-block;
      background-color: #141414;
      color: #FFD600;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    `,
  };

  if (type === "confirmation") {
    subject = `✅ Reserva Confirmada - ${roomName}`;
    htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Confirmada</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="${styles.container}">
          <!-- Header -->
          <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">✅ Reserva Confirmada</h1>
            <p style="${styles.headerSubtitle}">Sistema de Reservas de Salas</p>
          </div>
          
          <!-- Body -->
          <div style="${styles.body}">
            <p style="${styles.greeting}">Hola <strong>${userName}</strong>,</p>
            <p style="${styles.message}">
              Tu reserva ha sido creada exitosamente. A continuación encontrarás los detalles de tu reservación.
            </p>
            
            <!-- Detalles de la Reserva -->
            <div style="${styles.detailsBox}">
              <h3 style="${styles.detailsTitle}">📋 Detalles de la Reserva</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🏢 Sala:</td>
                  <td style="${styles.detailValue}"><span style="${styles.highlight}">${roomName}</span></td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">📅 Fecha:</td>
                  <td style="${styles.detailValue}">${date}</td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🕐 Hora:</td>
                  <td style="${styles.detailValue}">
                    <span style="${styles.badge}">${reservation.startTime} - ${reservation.endTime}</span>
                  </td>
                </tr>
                <tr style="${styles.detailItem}; border-bottom: none;">
                  <td style="${styles.detailLabel}">📝 Motivo:</td>
                  <td style="${styles.detailValue}">${reason}</td>
                </tr>
              </table>
            </div>
            
            <hr style="${styles.divider}">
            
            <p style="${styles.message}">
              Recuerda llegar puntual a tu reunión. Si necesitas cancelar o modificar la reserva, 
              puedes hacerlo desde el sistema de reservas.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="${styles.footer}">
            <p style="${styles.footerText}">
              ¡Gracias por usar nuestro sistema de reservas!<br>
              <span style="${styles.footerBrand}">Andrés Publicidad</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (type === "invitation") {
    subject = `📩 Invitación a Reunión - ${roomName}`;
    htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación a Reunión</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="${styles.container}">
          <!-- Header -->
          <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">📩 Invitación a Reunión</h1>
            <p style="${styles.headerSubtitle}">Has sido invitado a participar</p>
          </div>
          
          <!-- Body -->
          <div style="${styles.body}">
            <p style="${styles.greeting}">Hola <strong>${userName}</strong>,</p>
            <p style="${styles.message}">
              <strong style="color: #141414;">${creatorName}</strong> te ha invitado a participar en una reunión. 
              Por favor revisa los detalles a continuación.
            </p>
            
            <!-- Detalles de la Reunión -->
            <div style="${styles.detailsBox}">
              <h3 style="${styles.detailsTitle}">📋 Detalles de la Reunión</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🏢 Sala:</td>
                  <td style="${styles.detailValue}"><span style="${styles.highlight}">${roomName}</span></td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">📅 Fecha:</td>
                  <td style="${styles.detailValue}">${date}</td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🕐 Hora:</td>
                  <td style="${styles.detailValue}">
                    <span style="${styles.badge}">${reservation.startTime} - ${reservation.endTime}</span>
                  </td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">📝 Motivo:</td>
                  <td style="${styles.detailValue}">${reason}</td>
                </tr>
                <tr style="${styles.detailItem}; border-bottom: none;">
                  <td style="${styles.detailLabel}">👤 Organiza:</td>
                  <td style="${styles.detailValue}"><strong>${creatorName}</strong></td>
                </tr>
              </table>
            </div>
            
            <hr style="${styles.divider}">
            
            <p style="${styles.message}">
              Por favor, confirma tu asistencia a través del sistema de reservas o 
              comunícate directamente con el organizador si tienes alguna pregunta.
            </p>
            
            <!-- Botón de acción (opcional) -->
            <div style="text-align: center; margin-top: 25px;">
              <p style="font-size: 13px; color: #888888; margin: 0;">
                Este es un correo automático, por favor no responda directamente.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="${styles.footer}">
            <p style="${styles.footerText}">
              Sistema de Reservas de Salas<br>
              <span style="${styles.footerBrand}">Andrés Publicidad</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (type === "cancellation") {
    subject = `❌ Reunión Cancelada - ${roomName}`;
    htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reunión Cancelada</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="${styles.container}">
          <!-- Header -->
          <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">❌ Reunión Cancelada</h1>
            <p style="${styles.headerSubtitle}">La siguiente reunión ha sido cancelada</p>
          </div>
          
          <!-- Body -->
          <div style="${styles.body}">
            <p style="${styles.greeting}">Hola <strong>${userName}</strong>,</p>
            <p style="${styles.message}">
              Te informamos que la siguiente reunión ha sido <strong style="color: #dc3545;">cancelada</strong> por 
              <strong style="color: #141414;">${creatorName}</strong>.
            </p>
            
            <!-- Detalles de la Reunión Cancelada -->
            <div style="${styles.detailsBox}; border-left-color: #dc3545;">
              <h3 style="${styles.detailsTitle}; border-bottom-color: #dc3545;">📋 Detalles de la Reunión Cancelada</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🏢 Sala:</td>
                  <td style="${styles.detailValue}"><span style="${styles.highlight}; background-color: #dc3545; color: #fff;">${roomName}</span></td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">📅 Fecha:</td>
                  <td style="${styles.detailValue}"><s>${date}</s></td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">🕐 Hora:</td>
                  <td style="${styles.detailValue}">
                    <s>${reservation.startTime} - ${reservation.endTime}</s>
                  </td>
                </tr>
                <tr style="${styles.detailItem}">
                  <td style="${styles.detailLabel}">📝 Motivo:</td>
                  <td style="${styles.detailValue}">${reason}</td>
                </tr>
                <tr style="${styles.detailItem}; border-bottom: none;">
                  <td style="${styles.detailLabel}">👤 Organizador:</td>
                  <td style="${styles.detailValue}"><strong>${creatorName}</strong></td>
                </tr>
              </table>
            </div>
            
            <hr style="${styles.divider}">
            
            <p style="${styles.message}">
              Si tienes alguna pregunta sobre la cancelación, por favor comunícate directamente 
              con el organizador de la reunión.
            </p>
            
            <div style="text-align: center; margin-top: 25px;">
              <p style="font-size: 13px; color: #888888; margin: 0;">
                Este es un correo automático, por favor no responda directamente.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="${styles.footer}">
            <p style="${styles.footerText}">
              Sistema de Reservas de Salas<br>
              <span style="${styles.footerBrand}">Andrés Publicidad</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de ${type} enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de ${type}:`, error);
    throw error;
  }
};

// Función para enviar correo de registro de asistencia
export const sendAsistenciaEmail = async (
  to: string,
  userName: string,
  data: {
    fecha: string;
    tema: string;
    facilitador: string;
    enlaceFirma: string;
  }
): Promise<void> => {
  // Parsear la fecha manualmente para evitar el bug de UTC offset
  // new Date('YYYY-MM-DD') interpreta como UTC, lo que en Colombia (UTC-5) desplaza un día atrás
  const [yearF, monthF, dayF] = String(data.fecha).split('-');
  const fechaLocal = new Date(Number(yearF), Number(monthF) - 1, Number(dayF));
  const fechaFormateada = fechaLocal.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #FFD600;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #FFD600;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #FFD600;
    `,
    detailItem: `
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 100px;
    `,
    detailValue: `
      color: #555555;
    `,
    button: `
      display: inline-block;
      background-color: #FFD600;
      color: #141414;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 700;
      font-size: 16px;
      margin-top: 20px;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    warning: `
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    `,
  };

  const subject = `✍️ Registro de Asistencia - ${data.tema}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registro de Asistencia</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">✍️ Registro de Asistencia</h1>
          <p style="${styles.headerSubtitle}">Se requiere tu firma</p>
        </div>
        
        <!-- Body -->
        <div style="${styles.body}">
          <p style="${styles.greeting}">Hola <strong>${userName}</strong>,</p>
          <p style="${styles.message}">
            Has sido convocado a una actividad y necesitamos que registres tu asistencia 
            mediante tu firma digital.
          </p>
          
          <!-- Detalles -->
          <div style="${styles.detailsBox}">
            <h3 style="${styles.detailsTitle}">📋 Detalles del Evento</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📅 Fecha:</td>
                <td style="${styles.detailValue}">${fechaFormateada}</td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📝 Tema:</td>
                <td style="${styles.detailValue}">${data.tema}</td>
              </tr>
              <tr style="${styles.detailItem}; border-bottom: none;">
                <td style="${styles.detailLabel}">👤 Facilitador:</td>
                <td style="${styles.detailValue}">${data.facilitador}</td>
              </tr>
            </table>
          </div>
          
          <!-- Botón de firma -->
          <div style="text-align: center;">
            <a href="${data.enlaceFirma}" style="${styles.button}">
              ✍️ FIRMAR ASISTENCIA
            </a>
          </div>
          
          <!-- Advertencia -->
          <div style="${styles.warning}">
            <strong>⚠️ Importante:</strong> Este enlace es personal e intransferible. 
            Al firmar confirmas tu participación en esta actividad.
          </div>
          
          <p style="${styles.message}; margin-top: 25px; font-size: 13px; color: #888888;">
            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${data.enlaceFirma}" style="color: #141414; word-break: break-all;">${data.enlaceFirma}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="${styles.footer}">
          <p style="${styles.footerText}">
            Sistema de Registro de Asistencia<br>
            <span style="${styles.footerBrand}">Andrés Publicidad</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de asistencia enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de asistencia:`, error);
    throw error;
  }
};

// ==================== EMAILS DE ACTAS DE RECARGAS ====================

interface ActaRecargaEmailData {
  nombreRevisor: string;
  nombreEmisor: string;
  periodoInicio: Date;
  periodoFin: Date;
  anio: number;
  totalRequeridoProyectado: number | null;
  totalIngresadoTarjetas: number | null;
  totalRecargadoGoogleAds: number | null;
  totalReportadoFormularios: number | null;
  token: string;
  actaId: number;
}

interface ActaRecargaCompletadaEmailData {
  nombreEmisor: string;
  nombreRevisor: string;
  periodoInicio: Date;
  periodoFin: Date;
  anio: number;
  totalRequeridoProyectado: number | null;
  totalIngresadoTarjetas: number | null;
  totalRecargadoGoogleAds: number | null;
  totalReportadoFormularios: number | null;
  actaId: number;
}

export const sendActaRecargaEmail = async (
  to: string,
  data: ActaRecargaEmailData
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const enlaceFirma = `${frontendUrl}/firmar-acta/${data.token}`;
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
    });
  };

  const formatMoney = (amount: number | null) => {
    if (amount === null) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #FFD600;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #FFD600;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #FFD600;
    `,
    detailItem: `
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 150px;
    `,
    detailValue: `
      color: #555555;
    `,
    highlight: `
      background-color: #FFD600;
      color: #141414;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    `,
    button: `
      display: inline-block;
      background-color: #141414;
      color: #FFD600;
      padding: 14px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    warning: `
      background-color: #FFF3CD;
      border: 1px solid #FFD600;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    `,
  };

  const subject = `📋 Acta de Validación de Recargas - Pendiente de Firma`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acta de Validación de Recargas</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">📋 Acta de Validación y Cierre de Recargas</h1>
          <p style="${styles.headerSubtitle}">Pendiente de Revisión y Firma</p>
        </div>
        
        <!-- Body -->
        <div style="${styles.body}">
          <p style="${styles.greeting}">Hola <strong>${data.nombreRevisor}</strong>,</p>
          <p style="${styles.message}">
            <strong>${data.nombreEmisor}</strong> ha enviado un Acta de Validación y Cierre de Recargas 
            que requiere tu revisión y firma.
          </p>
          
          <!-- Detalles del Acta -->
          <div style="${styles.detailsBox}">
            <h3 style="${styles.detailsTitle}">📋 Detalles del Acta</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📅 Periodo de Revisión:</td>
                <td style="${styles.detailValue}">
                  <span style="${styles.highlight}">${formatDate(data.periodoInicio)} al ${formatDate(data.periodoFin)} de ${data.anio}</span>
                </td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">💰 Total Requerido Proyectado:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalRequeridoProyectado)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">💳 Total Ingresado a Tarjetas:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalIngresadoTarjetas)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📊 Total Recargado Google ADS:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalRecargadoGoogleAds)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📋 Total Reportado Formularios:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalReportadoFormularios)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}; border-bottom: none;">
                <td style="${styles.detailLabel}">👤 Enviado por:</td>
                <td style="${styles.detailValue}">${data.nombreEmisor}</td>
              </tr>
            </table>
          </div>
          
          <!-- Botón de firma -->
          <div style="text-align: center;">
            <a href="${enlaceFirma}" style="${styles.button}">
              ✍️ REVISAR Y FIRMAR ACTA
            </a>
          </div>
          
          <!-- Advertencia -->
          <div style="${styles.warning}">
            <strong>⚠️ Importante:</strong> Al firmar, confirmarás que has revisado y verificado los montos 
            y novedades de activación, presupuestos y otras, en las cuentas correspondientes al periodo. Este enlace expira en 7 días.
          </div>
          
          <p style="${styles.message}; margin-top: 25px; font-size: 13px; color: #888888;">
            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${enlaceFirma}" style="color: #141414; word-break: break-all;">${enlaceFirma}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="${styles.footer}">
          <p style="${styles.footerText}">
            Sistema de Actas de Recargas<br>
            <span style="${styles.footerBrand}">Andrés Publicidad</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de acta de recarga enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de acta de recarga:`, error);
    throw error;
  }
};

export const sendActaRecargaCompletadaEmail = async (
  to: string,
  data: ActaRecargaCompletadaEmailData
): Promise<void> => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
    });
  };

  const formatMoney = (amount: number | null) => {
    if (amount === null) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #28a745;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #28a745;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #28a745;
    `,
    detailItem: `
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 150px;
    `,
    detailValue: `
      color: #555555;
    `,
    highlight: `
      background-color: #28a745;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    warning: `
      background-color: #F8D7DA;
      border: 1px solid #F5C6CB;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #721C24;
    `,
    success: `
      background-color: #D4EDDA;
      border: 1px solid #C3E6CB;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #155724;
    `,
  };

  const subject = `✅ Acta de Validación de Recargas - Completada`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acta de Validación Completada</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">✅ Acta Completada</h1>
          <p style="${styles.headerSubtitle}">Validación y Cierre de Recargas</p>
        </div>
        
        <!-- Body -->
        <div style="${styles.body}">
          <p style="${styles.greeting}">Hola <strong>${data.nombreEmisor}</strong>,</p>
          <p style="${styles.message}">
            El acta de validación y cierre de recargas ha sido firmada y completada por 
            <strong>${data.nombreRevisor}</strong>.
          </p>
          
          <!-- Detalles del Acta -->
          <div style="${styles.detailsBox}">
            <h3 style="${styles.detailsTitle}">📋 Resumen del Acta</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📅 Periodo:</td>
                <td style="${styles.detailValue}">
                  ${formatDate(data.periodoInicio)} al ${formatDate(data.periodoFin)} de ${data.anio}
                </td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">💰 Total Requerido Proyectado:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalRequeridoProyectado)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">💳 Total Ingresado a Tarjetas:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalIngresadoTarjetas)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📊 Total Recargado Google ADS:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalRecargadoGoogleAds)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📋 Total Reportado Formularios:</td>
                <td style="${styles.detailValue}"><strong>${formatMoney(data.totalReportadoFormularios)}</strong></td>
              </tr>
              <tr style="${styles.detailItem}; border-bottom: none;">
                <td style="${styles.detailLabel}">✅ Estado:</td>
                <td style="${styles.detailValue}"><span style="${styles.highlight}">COMPLETADO</span></td>
              </tr>
            </table>
          </div>
          
          <div style="${styles.success}">
            <strong>✅ Validación exitosa:</strong> El acta ha sido revisada, firmada y completada correctamente por ${data.nombreRevisor}.
          </div>
          
          <p style="${styles.message}; margin-top: 25px;">
            Puedes acceder al sistema para ver el acta completa y descargarla en formato PDF.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="${styles.footer}">
          <p style="${styles.footerText}">
            Sistema de Actas de Recargas<br>
            <span style="${styles.footerBrand}">Andrés Publicidad</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de acta completada enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de acta completada:`, error);
    throw error;
  }
};

// ==================== EMAIL DE ENTREGA DE EPP ====================

export const sendEntregaEppEmail = async (
  to: string,
  nombreFirmante: string,
  data: {
    fecha: string;
    empresa: string;
    tipoFirma: string;
    enlaceFirma: string;
  }
): Promise<void> => {
  // Parsear la fecha manualmente para evitar el bug de UTC offset
  // new Date('YYYY-MM-DD') interpreta como UTC, lo que en Colombia (UTC-5) desplaza un día atrás
  const [yearF, monthF, dayF] = String(data.fecha).split('-');
  const fechaLocal = new Date(Number(yearF), Number(monthF) - 1, Number(dayF));
  const fechaFormateada = fechaLocal.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #FFD600;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #FFD600;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #FFD600;
    `,
    detailItem: `
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 100px;
    `,
    detailValue: `
      color: #555555;
    `,
    button: `
      display: inline-block;
      background-color: #FFD600;
      color: #141414;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 700;
      font-size: 16px;
      margin-top: 20px;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    warning: `
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    `,
  };

  const subject = `🛡️ Entrega de EPP - Firma Requerida`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Entrega de EPP</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">🛡️ Entrega de EPP</h1>
          <p style="${styles.headerSubtitle}">Se requiere tu firma</p>
        </div>

        <!-- Body -->
        <div style="${styles.body}">
          <p style="${styles.greeting}">Hola <strong>${nombreFirmante}</strong>,</p>
          <p style="${styles.message}">
            Se ha registrado una entrega de Elementos de Protección Personal (EPP) y necesitamos
            que confirmes la recepción mediante tu firma digital.
          </p>

          <!-- Detalles -->
          <div style="${styles.detailsBox}">
            <h3 style="${styles.detailsTitle}">📋 Detalles de la Entrega</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">📅 Fecha:</td>
                <td style="${styles.detailValue}">${fechaFormateada}</td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">🏢 Empresa:</td>
                <td style="${styles.detailValue}">${data.empresa || 'No especificada'}</td>
              </tr>
              <tr style="${styles.detailItem}; border-bottom: none;">
                <td style="${styles.detailLabel}">📝 Rol de Firma:</td>
                <td style="${styles.detailValue}">${data.tipoFirma}</td>
              </tr>
            </table>
          </div>

          <!-- Botón de firma -->
          <div style="text-align: center;">
            <a href="${data.enlaceFirma}" style="${styles.button}">
              ✍️ FIRMAR ENTREGA DE EPP
            </a>
          </div>

          <!-- Advertencia -->
          <div style="${styles.warning}">
            <strong>⚠️ Importante:</strong> Este enlace es personal e intransferible.
            Al firmar confirmas la recepción de los elementos de protección personal.
          </div>

          <p style="${styles.message}; margin-top: 25px; font-size: 13px; color: #888888;">
            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${data.enlaceFirma}" style="color: #141414; word-break: break-all;">${data.enlaceFirma}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="${styles.footer}">
          <p style="${styles.footerText}">
            Sistema SSGT - EPP<br>
            <span style="${styles.footerBrand}">Andrés Publicidad</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de entrega de EPP enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de entrega de EPP:`, error);
    throw error;
  }
};

// ==================== EMAIL DE FIRMA DE DOCUMENTO ====================

export const sendDocumentoFirmaEmail = async (
  to: string,
  nombreFirmante: string,
  data: { titulo: string; empresa: string; etiqueta: string; enlaceFirma: string }
): Promise<void> => {
  const styles = {
    container: `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
    header: `
      background-color: #141414;
      padding: 25px 30px;
      text-align: center;
    `,
    headerTitle: `
      color: #FFD600;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    `,
    headerSubtitle: `
      color: #ffffff;
      font-size: 14px;
      margin: 8px 0 0 0;
      opacity: 0.9;
    `,
    body: `
      padding: 30px;
    `,
    greeting: `
      font-size: 16px;
      color: #141414;
      margin: 0 0 15px 0;
    `,
    message: `
      font-size: 15px;
      color: #555555;
      line-height: 1.6;
      margin: 0 0 20px 0;
    `,
    detailsBox: `
      background-color: #f9f9f9;
      border-left: 4px solid #FFD600;
      border-radius: 0 6px 6px 0;
      padding: 20px;
      margin: 20px 0;
    `,
    detailsTitle: `
      font-size: 16px;
      font-weight: 700;
      color: #141414;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #FFD600;
    `,
    detailItem: `
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
      font-size: 14px;
    `,
    detailLabel: `
      color: #141414;
      font-weight: 600;
      min-width: 100px;
    `,
    detailValue: `
      color: #555555;
    `,
    button: `
      display: inline-block;
      background-color: #FFD600;
      color: #141414;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 700;
      font-size: 16px;
      margin-top: 20px;
    `,
    footer: `
      background-color: #141414;
      padding: 20px 30px;
      text-align: center;
    `,
    footerText: `
      color: #ffffff;
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    `,
    footerBrand: `
      color: #FFD600;
      font-weight: 700;
    `,
    warning: `
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    `,
  };

  const subject = `Firma requerida - ${data.titulo}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Firma de Documento</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">FIRMA DE DOCUMENTO</h1>
          <p style="${styles.headerSubtitle}">Se requiere tu firma</p>
        </div>

        <!-- Body -->
        <div style="${styles.body}">
          <p style="${styles.greeting}">Hola <strong>${nombreFirmante}</strong>,</p>
          <p style="${styles.message}">
            Se ha generado un documento que requiere tu firma digital.
            Por favor revisa los detalles a continuacion y procede a firmarlo.
          </p>

          <!-- Detalles -->
          <div style="${styles.detailsBox}">
            <h3 style="${styles.detailsTitle}">Detalles del Documento</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">Documento:</td>
                <td style="${styles.detailValue}">${data.titulo}</td>
              </tr>
              <tr style="${styles.detailItem}">
                <td style="${styles.detailLabel}">Rol:</td>
                <td style="${styles.detailValue}">${data.etiqueta}</td>
              </tr>
              <tr style="${styles.detailItem}; border-bottom: none;">
                <td style="${styles.detailLabel}">Empresa:</td>
                <td style="${styles.detailValue}">${data.empresa || 'No especificada'}</td>
              </tr>
            </table>
          </div>

          <!-- Boton de firma -->
          <div style="text-align: center;">
            <a href="${data.enlaceFirma}" style="${styles.button}">
              FIRMAR DOCUMENTO
            </a>
          </div>

          <!-- Advertencia -->
          <div style="${styles.warning}">
            <strong>Importante:</strong> Este enlace es personal e intransferible.
            Al firmar confirmas que has revisado y aceptas el contenido del documento.
          </div>

          <p style="${styles.message}; margin-top: 25px; font-size: 13px; color: #888888;">
            Si no puedes hacer clic en el boton, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${data.enlaceFirma}" style="color: #141414; word-break: break-all;">${data.enlaceFirma}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="${styles.footer}">
          <p style="${styles.footerText}">
            Sistema SSGT - Documentos<br>
            <span style="${styles.footerBrand}">Andres Publicidad</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
      "X-Entity-Ref-ID": crypto.randomUUID(),
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email de firma de documento enviado a ${to}`);
  } catch (error) {
    console.error(`Error al enviar email de firma de documento:`, error);
    throw error;
  }
};
