import { Request, Response } from 'express';
import whatsappService from '../services/whatsapp';
import { User } from '../models/user';
import { CapacitacionSST } from '../models/ssgt';

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

// Notificar capacitación por WhatsApp
export const notificarCapacitacion = async (req: Request, res: Response): Promise<any> => {
    try {
        const { capacitacionId, mensaje } = req.body;

        const capacitacion = await CapacitacionSST.findByPk(capacitacionId);
        if (!capacitacion) {
            return res.status(404).json({ msg: 'Capacitación no encontrada' });
        }

        // Obtener usuarios con celular de la misma empresa
        const where: any = { status: 1 };
        if (capacitacion.empresa) {
            where.empresa = capacitacion.empresa;
        }

        const usuarios = await User.findAll({
            where,
            attributes: ['Uid', 'name', 'lastName', 'celular'],
        });

        const conCelular = usuarios.filter(u => u.celular);

        if (conCelular.length === 0) {
            return res.status(400).json({ msg: 'No hay usuarios con celular registrado' });
        }

        const textoMensaje = mensaje || `Hola, le informamos que está programada la capacitación "${capacitacion.titulo}" para el ${capacitacion.fechaProgramada}${capacitacion.lugar ? ` en ${capacitacion.lugar}` : ''}${capacitacion.horaInicio ? ` a las ${capacitacion.horaInicio}` : ''}. Por favor asista puntualmente.`;

        const recipients = conCelular.map(u => ({
            phone: u.celular!,
            message: textoMensaje,
        }));

        const result = await whatsappService.sendBulkMessages(recipients);

        return res.json({
            msg: `Notificación enviada: ${result.sent} exitosos, ${result.failed} fallidos`,
            ...result,
        });
    } catch (error) {
        console.error('Error al notificar capacitación:', error);
        return res.status(500).json({ msg: 'Error al enviar notificaciones' });
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
