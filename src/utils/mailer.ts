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
      // 'References': uniqueReferencesId
    },
    references: undefined,
    attachments: undefined as any,
    inReplyTo: undefined,
  };
  if (attachments) {
    const pdfFileName = 'documento.pdf'; // Nombre fijo para el PDF
    
    if (Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((buffer, index) => ({
        filename: index === 0 ? pdfFileName : `documento_${index + 1}.pdf`, // documento.pdf, documento_2.pdf, etc.
        content: buffer,
        contentType: 'application/pdf', // Especificamos que es PDF
      }));
    } else {
      mailOptions.attachments = [{
        filename: pdfFileName,
        content: attachments,
        contentType: 'application/pdf',
      }];
    }
  }

  return transporter.sendMail(mailOptions);
};