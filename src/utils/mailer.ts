import nodemailer from 'nodemailer';
import crypto from 'crypto'
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // Servicio de correo electrónico (por ejemplo, 'gmail')
  auth: {
    user: process.env.EMAIL_USER, // Tu correo electrónico
    pass: process.env.EMAIL_PASS, // Tu contraseña
  },
});

export const sendMail = (to: string[], subject: string, text: string) => {
  const domain = process.env.EMAIL_SERVICE;
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to.join(','),
    subject,
    text,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
    },
    inReplyTo: undefined,
    references: undefined
  };

  return transporter.sendMail(mailOptions);
};