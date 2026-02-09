"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAsistenciaEmail = exports.sendReservationEmail = exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const transporter = nodemailer_1.default.createTransport({
    service: process.env.EMAIL_SERVICE, // Servicio de correo electrónico (por ejemplo, 'gmail')
    auth: {
        user: process.env.EMAIL_USER, // Tu correo electrónico
        pass: process.env.EMAIL_PASS, // Tu contraseña
    },
});
const sendMail = (to, subject, text, attachments) => {
    const domain = process.env.EMAIL_SERVICE;
    const messageId = `<${crypto_1.default.randomUUID()}@${domain}.com>`;
    // const uniqueReferencesId = crypto.randomUUID();
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to.join(","),
        subject: `[${crypto_1.default.randomUUID().substring(0, 8)}] ${subject}`,
        text,
        headers: {
            "Message-ID": messageId,
            "X-Entity-Ref-ID": crypto_1.default.randomUUID(),
            Precedence: "bulk",
            "Auto-Submitted": "auto-generated",
            "X-Google-Thread-Id": crypto_1.default.randomUUID(),
        },
        references: undefined,
        attachments: undefined,
        inReplyTo: undefined,
    };
    if (attachments && attachments !== null) {
        const getFileType = (buffer) => {
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
                    filename: index === 0
                        ? `documento.${fileTpye.ext}`
                        : `documento_${index + 1}.${fileTpye.ext}`,
                    content: buffer,
                    contentType: fileTpye.mime,
                };
            });
        }
        else {
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
    return transporter.sendMail(mailOptions);
};
exports.sendMail = sendMail;
const sendReservationEmail = (to, userName, reservation, type) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const roomName = ((_a = reservation.Room) === null || _a === void 0 ? void 0 : _a.name) || "Sala desconocida";
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
    const creatorName = `${((_b = reservation.User) === null || _b === void 0 ? void 0 : _b.name) || ""} ${((_c = reservation.User) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim();
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
    }
    else if (type === "invitation") {
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
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: htmlBody,
        headers: {
            "Message-ID": `<${crypto_1.default.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
            "X-Entity-Ref-ID": crypto_1.default.randomUUID(),
            Precedence: "bulk",
            "Auto-Submitted": "auto-generated",
        },
    };
    try {
        yield transporter.sendMail(mailOptions);
        console.log(`Email de ${type} enviado a ${to}`);
    }
    catch (error) {
        console.error(`Error al enviar email de ${type}:`, error);
        throw error;
    }
});
exports.sendReservationEmail = sendReservationEmail;
// Función para enviar correo de registro de asistencia
const sendAsistenciaEmail = (to, userName, data) => __awaiter(void 0, void 0, void 0, function* () {
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
            "Message-ID": `<${crypto_1.default.randomUUID()}@${process.env.EMAIL_SERVICE}.com>`,
            "X-Entity-Ref-ID": crypto_1.default.randomUUID(),
            Precedence: "bulk",
            "Auto-Submitted": "auto-generated",
        },
    };
    try {
        yield transporter.sendMail(mailOptions);
        console.log(`Email de asistencia enviado a ${to}`);
    }
    catch (error) {
        console.error(`Error al enviar email de asistencia:`, error);
        throw error;
    }
});
exports.sendAsistenciaEmail = sendAsistenciaEmail;
