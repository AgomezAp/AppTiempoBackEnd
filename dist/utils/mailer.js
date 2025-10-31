"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
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
        to: to.join(','),
        subject: `[${crypto_1.default.randomUUID().substring(0, 8)}] ${subject}`,
        text,
        headers: {
            'Message-ID': messageId,
            'X-Entity-Ref-ID': crypto_1.default.randomUUID(),
            'Precedence': 'bulk',
            'Auto-Submitted': 'auto-generated',
            'X-Google-Thread-Id': crypto_1.default.randomUUID(),
        },
        references: undefined,
        attachments: undefined,
        inReplyTo: undefined,
    };
    if (attachments && attachments !== null) {
        const getFileType = (buffer) => {
            const header = buffer.toString('hex', 0, 4).toUpperCase();
            if (header.startsWith('25504446'))
                return { ext: 'pdf', mime: 'application/pdf' };
            if (header.startsWith('FFD8FF'))
                return { ext: 'jpg', mime: 'image/jpeg' };
            if (header.startsWith('89504E47'))
                return { ext: 'png', mime: 'image/png' };
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
        }
        else {
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
exports.sendMail = sendMail;
