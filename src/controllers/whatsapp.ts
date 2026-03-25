import { Request, Response } from 'express';
import whatsappService from '../services/whatsapp';
import { User } from '../models/user';
import * as fs from 'fs';
import * as path from 'path';

// Inicializar WhatsApp (genera QR)
export const inicializarWhatsApp = async (req: Request, res: Response): Promise<any> => {
    try {
        const status = whatsappService.getStatus();
        if (status === 'ready') {
            return res.json({ msg: 'WhatsApp ya está conectado', status: 'ready' });
        }

        whatsappService.initialize().catch((error) => {
            console.error('Inicialización asíncrona WhatsApp falló:', error);
        });
        return res.json({ msg: 'Inicializando WhatsApp, esperando QR...', status: 'loading' });
    } catch (error) {
        console.error('Error al inicializar WhatsApp:', error);
        return res.status(500).json({ msg: 'Error al inicializar WhatsApp', error: whatsappService.getLastError() });
    }
};

// Obtener estado y QR
export const obtenerEstadoWhatsApp = async (req: Request, res: Response): Promise<any> => {
    try {
        const status = whatsappService.getStatus();
        const qr = whatsappService.getQRCode();
        const error = whatsappService.getLastError();

        return res.json({ status, qr, error });
    } catch (error) {
        console.error('Error al obtener estado:', error);
        return res.status(500).json({ msg: 'Error al obtener estado' });
    }
};

// SSE endpoint para actualizaciones en tiempo real
export const sseWhatsApp = async (req: Request, res: Response): Promise<any> => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Enviar estado actual
    const status = whatsappService.getStatus();
    const qr = whatsappService.getQRCode();
    const error = whatsappService.getLastError();
    res.write(`data: ${JSON.stringify({ type: 'status', status, qr, error })}\n\n`);

    whatsappService.addSSEClient(res);
};

// Desconectar WhatsApp
export const desconectarWhatsApp = async (req: Request, res: Response): Promise<any> => {
    try {
        await whatsappService.disconnect();
        return res.json({ msg: 'WhatsApp desconectado' });
    } catch (error) {
        console.error('Error al desconectar WhatsApp:', error);
        return res.status(500).json({ msg: 'Error al desconectar WhatsApp' });
    }
};

// Enviar mensaje individual
export const enviarMensaje = async (req: Request, res: Response): Promise<any> => {
    try {
        const { telefono, mensaje } = req.body;

        if (!telefono || !mensaje) {
            return res.status(400).json({ msg: 'Teléfono y mensaje son requeridos' });
        }

        const result = await whatsappService.sendMessage(telefono, mensaje);

        if (result.success) {
            return res.json({ msg: 'Mensaje enviado correctamente' });
        } else {
            return res.status(400).json({ msg: result.error });
        }
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        return res.status(500).json({ msg: 'Error al enviar mensaje' });
    }
};

// Enviar mensajes masivos
export const enviarMensajeMasivo = async (req: Request, res: Response): Promise<any> => {
    try {
        const { empresa, mensaje } = req.body;

        if (!mensaje) {
            return res.status(400).json({ msg: 'El mensaje es requerido' });
        }

        const where: any = { status: 1 };
        if (empresa) where.empresa = empresa;

        const usuarios = await User.findAll({
            where,
            attributes: ['Uid', 'name', 'lastName', 'celular'],
        });

        const conCelular = usuarios.filter(u => u.celular);

        if (conCelular.length === 0) {
            return res.status(400).json({ msg: 'No hay usuarios con celular registrado' });
        }

        const recipients = conCelular.map(u => ({
            phone: u.celular!,
            message: mensaje,
        }));

        const result = await whatsappService.sendBulkMessages(recipients);

        return res.json({
            msg: `Mensajes enviados: ${result.sent} exitosos, ${result.failed} fallidos`,
            ...result,
        });
    } catch (error) {
        console.error('Error al enviar mensaje masivo:', error);
        return res.status(500).json({ msg: 'Error al enviar mensajes' });
    }
};

// Enviar mensaje con archivo adjunto
export const enviarMensajeConMedia = async (req: Request, res: Response): Promise<any> => {
    try {
        const { telefonos, mensaje } = req.body;
        const file = req.file;

        if (!telefonos || !mensaje) {
            return res.status(400).json({ msg: 'Teléfonos y mensaje son requeridos' });
        }

        const listaTelefonos: string[] = JSON.parse(telefonos);

        let sent = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const tel of listaTelefonos) {
            let result;
            if (file) {
                result = await whatsappService.sendMessageWithMedia(tel, mensaje, file.path, file.originalname);
            } else {
                result = await whatsappService.sendMessage(tel, mensaje);
            }
            if (result.success) sent++;
            else {
                failed++;
                errors.push(`${tel}: ${result.error}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Limpiar archivo temporal
        if (file && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
        }

        return res.json({
            msg: `Mensajes enviados: ${sent} exitosos, ${failed} fallidos`,
            sent, failed, errors,
        });
    } catch (error) {
        console.error('Error al enviar mensaje con media:', error);
        return res.status(500).json({ msg: 'Error al enviar mensaje con archivo' });
    }
};

// Programar mensaje
export const programarMensaje = async (req: Request, res: Response): Promise<any> => {
    try {
        const { telefonos, mensaje, fechaEnvio } = req.body;
        const file = req.file;

        if (!telefonos || !mensaje || !fechaEnvio) {
            return res.status(400).json({ msg: 'Teléfonos, mensaje y fecha de envío son requeridos' });
        }

        const listaTelefonos: string[] = JSON.parse(telefonos);
        const fecha = new Date(fechaEnvio);
        if (fecha <= new Date()) {
            return res.status(400).json({ msg: 'La fecha de envío debe ser futura' });
        }

        const scheduled = whatsappService.programarMensaje({
            telefonos: listaTelefonos,
            mensaje,
            fechaEnvio: fecha.toISOString(),
            mediaPath: file?.path,
            mediaName: file?.originalname,
        });

        return res.json({ msg: 'Mensaje programado correctamente', scheduled });
    } catch (error) {
        console.error('Error al programar mensaje:', error);
        return res.status(500).json({ msg: 'Error al programar mensaje' });
    }
};

// Obtener mensajes programados
export const obtenerProgramados = async (req: Request, res: Response): Promise<any> => {
    try {
        const programados = whatsappService.obtenerProgramados();
        return res.json(programados);
    } catch (error) {
        return res.status(500).json({ msg: 'Error al obtener programados' });
    }
};

// Cancelar mensaje programado
export const cancelarProgramado = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const ok = whatsappService.cancelarProgramado(id);
        if (ok) {
            return res.json({ msg: 'Mensaje programado cancelado' });
        }
        return res.status(400).json({ msg: 'No se pudo cancelar (ya enviado o no existe)' });
    } catch (error) {
        return res.status(500).json({ msg: 'Error al cancelar mensaje' });
    }
};
