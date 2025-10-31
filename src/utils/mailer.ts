import nodemailer from 'nodemailer';
import crypto from 'crypto'
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // Servicio de correo electrónico (por ejemplo, 'gmail')
  auth: {
    user: process.env.EMAIL_USER, // Tu correo electrónico
    pass: process.env.EMAIL_PASS, // Tu contraseña
  },
});

export const sendMail = (to: string[], subject: string, text: string, attachments?: Buffer | Buffer[] | null) => {
  const domain = process.env.EMAIL_SERVICE;
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;
  // const uniqueReferencesId = crypto.randomUUID();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to.join(','),
    subject: `[${crypto.randomUUID().substring(0, 8)}] ${subject}`,
    text,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
    references: undefined,
    attachments: undefined as any,
    inReplyTo: undefined,
  };
  if (attachments && attachments !== null) {
    const getFileType = (buffer: Buffer) => {
      const header = buffer.toString('hex', 0, 4).toUpperCase();
      if (header.startsWith('25504446')) return { ext: 'pdf', mime: 'application/pdf'};
      if (header.startsWith('FFD8FF')) return { ext: 'jpg', mime: 'image/jpeg'};
      if (header.startsWith('89504E47')) return { ext: 'png', mime: 'image/png'};
      return { ext: 'pdf', mime: 'application/pdf' };
    };
    if (Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((buffer, index) => {
        const fileTpye = getFileType(buffer);
        return {
          filename: index === 0 ? `documento.${fileTpye.ext}` : `documento_${index + 1}.${fileTpye.ext}`,
          content: buffer,
          contentType: fileTpye.mime
        };
      });
    } else {
      const fileTpye = getFileType(attachments);
      mailOptions.attachments = [{
        filename: `documento.${fileTpye.ext}`,
        content: attachments,
        contentType: fileTpye.mime,
      }];
    }
  }
  return transporter.sendMail(mailOptions);
};