"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Configuración del transportador de nodemailer.
 *
 * @type {nodemailer.Transporter}
 *
 * @example
 * // Ejemplo de uso:
 * // const transporter = nodemailer.createTransport({
 * //   service: 'gmail',
 * //   auth: {
 * //     user: 'tu_correo@gmail.com',
 * //     pass: 'tu_contraseña',
 * //   },
 * // });
 */
const transporter = nodemailer_1.default.createTransport({
    service: process.env.EMAIL_SERVICE, // Servicio de correo electrónico (por ejemplo, 'gmail')
    auth: {
        user: process.env.EMAIL_USER, // Tu correo electrónico
        pass: process.env.EMAIL_PASS, // Tu contraseña
    },
});
/**
 * Envía un correo electrónico.
 *
 * @param {string[]} to - Lista de destinatarios del correo electrónico.
 * @param {string} subject - Asunto del correo electrónico.
 * @param {string} text - Cuerpo del correo electrónico.
 * @returns {Promise<nodemailer.SentMessageInfo>} - Una promesa que resuelve con la información del mensaje enviado.
 *
 * @example
 * // Ejemplo de uso:
 * // sendMail(['destinatario@example.com'], 'Asunto del correo', 'Cuerpo del correo')
 * //   .then(info => {
 * //     console.log('Correo enviado:', info);
 * //   })
 * //   .catch(error => {
 * //     console.error('Error al enviar el correo:', error);
 * //   });
 */
const sendMail = (to, subject, text) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to.join(','),
        subject,
        text,
    };
    return transporter.sendMail(mailOptions);
};
exports.sendMail = sendMail;
