import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // Servicio de correo electrónico (por ejemplo, 'gmail')
  auth: {
    user: process.env.EMAIL_USER, // Tu correo electrónico
    pass: process.env.EMAIL_PASS, // Tu contraseña
  },
});

export const sendMail = (to: string, subject: string, text: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
};