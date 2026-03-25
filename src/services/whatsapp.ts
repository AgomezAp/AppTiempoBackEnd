import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';

type SessionStatus = 'disconnected' | 'qr_pending' | 'loading' | 'ready';

interface ScheduledMessage {
    id: string;
    telefonos: string[];
    mensaje: string;
    fechaEnvio: string; // ISO string
    mediaPath?: string;
    mediaName?: string;
    estado: 'pendiente' | 'enviado' | 'fallido' | 'cancelado';
    resultado?: string;
    creadoEn: string;
}

class WhatsAppService {
    private client: Client | null = null;
    private qrCodeDataUrl: string | null = null;
    private status: SessionStatus = 'disconnected';
    private lastError: string | null = null;
    private sseClients: Set<any> = new Set();
    private scheduledMessages: ScheduledMessage[] = [];
    private schedulerJob: cron.ScheduledTask | null = null;

    getStatus(): SessionStatus {
        return this.status;
    }

    getQRCode(): string | null {
        return this.qrCodeDataUrl;
    }

    getLastError(): string | null {
        return this.lastError;
    }

    constructor() {
        this.startScheduler();
    }

    async initialize(): Promise<void> {
        if (this.client) {
            return;
        }

        this.status = 'loading';
        this.lastError = null;

        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
            puppeteer: {
                headless: true,
                executablePath: process.env.WHATSAPP_CHROME_PATH || undefined,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            },
        });

        this.client.on('qr', async (qr) => {
            this.status = 'qr_pending';
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
            this.notifySSEClients({ type: 'qr', qr: this.qrCodeDataUrl });
        });

        this.client.on('ready', () => {
            this.status = 'ready';
            this.qrCodeDataUrl = null;
            this.lastError = null;
            this.notifySSEClients({ type: 'ready' });
            console.log('WhatsApp client ready');
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp authenticated');
            this.notifySSEClients({ type: 'authenticated' });
        });

        this.client.on('auth_failure', (msg) => {
            this.status = 'disconnected';
            this.lastError = `Fallo de autenticación de WhatsApp: ${msg}`;
            console.error('WhatsApp auth failure:', msg);
            this.notifySSEClients({ type: 'auth_failure', msg });
        });

        this.client.on('disconnected', (reason) => {
            this.status = 'disconnected';
            this.client = null;
            this.lastError = `Cliente desconectado: ${reason}`;
            console.log('WhatsApp disconnected:', reason);
            this.notifySSEClients({ type: 'disconnected', reason });
        });

        try {
            await this.client.initialize();
        } catch (error: any) {
            this.status = 'disconnected';
            this.client = null;
            this.qrCodeDataUrl = null;
            this.lastError = error?.message || 'No se pudo inicializar WhatsApp Web';
            console.error('Error inicializando WhatsApp client:', error);
            this.notifySSEClients({ type: 'error', msg: this.lastError });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
            this.status = 'disconnected';
            this.qrCodeDataUrl = null;
            this.lastError = null;
        }
    }

    async sendMessage(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
        if (!this.client || this.status !== 'ready') {
            return { success: false, error: 'WhatsApp no está conectado' };
        }

        try {
            // Format number: remove +, spaces, dashes
            let numero = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
            // Add Colombia country code if not present
            if (!numero.startsWith('57') && numero.length === 10) {
                numero = '57' + numero;
            }
            const chatId = numero + '@c.us';

            await this.client.sendMessage(chatId, message);
            return { success: true };
        } catch (error: any) {
            console.error('Error sending WhatsApp message:', error);
            return { success: false, error: error.message };
        }
    }

    async sendBulkMessages(recipients: { phone: string; message: string }[]): Promise<{ sent: number; failed: number; errors: string[] }> {
        let sent = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const recipient of recipients) {
            const result = await this.sendMessage(recipient.phone, recipient.message);
            if (result.success) {
                sent++;
            } else {
                failed++;
                errors.push(`${recipient.phone}: ${result.error}`);
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        return { sent, failed, errors };
    }

    // SSE (Server-Sent Events) for real-time QR updates
    addSSEClient(res: any): void {
        this.sseClients.add(res);
        res.on('close', () => {
            this.sseClients.delete(res);
        });
    }

    private notifySSEClients(data: any): void {
        for (const client of this.sseClients) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    // === Enviar mensaje con archivo adjunto ===
    async sendMessageWithMedia(phoneNumber: string, message: string, filePath: string, fileName: string): Promise<{ success: boolean; error?: string }> {
        if (!this.client || this.status !== 'ready') {
            return { success: false, error: 'WhatsApp no está conectado' };
        }

        try {
            let numero = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
            if (!numero.startsWith('57') && numero.length === 10) {
                numero = '57' + numero;
            }
            const chatId = numero + '@c.us';

            const media = MessageMedia.fromFilePath(filePath);
            media.filename = fileName;

            await this.client.sendMessage(chatId, media, { caption: message || '' });
            return { success: true };
        } catch (error: any) {
            console.error('Error sending WhatsApp media:', error);
            return { success: false, error: error.message };
        }
    }

    // === Mensajes programados ===
    private startScheduler(): void {
        // Revisar cada minuto si hay mensajes pendientes
        this.schedulerJob = cron.schedule('* * * * *', async () => {
            const ahora = new Date();
            const pendientes = this.scheduledMessages.filter(
                m => m.estado === 'pendiente' && new Date(m.fechaEnvio) <= ahora
            );

            for (const msg of pendientes) {
                if (this.status !== 'ready') {
                    msg.estado = 'fallido';
                    msg.resultado = 'WhatsApp no está conectado';
                    continue;
                }

                let enviadosOk = 0;
                let enviadosFail = 0;

                for (const tel of msg.telefonos) {
                    let result;
                    if (msg.mediaPath && fs.existsSync(msg.mediaPath)) {
                        result = await this.sendMessageWithMedia(tel, msg.mensaje, msg.mediaPath, msg.mediaName || 'archivo');
                    } else {
                        result = await this.sendMessage(tel, msg.mensaje);
                    }
                    if (result.success) enviadosOk++;
                    else enviadosFail++;
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                msg.estado = enviadosFail === 0 ? 'enviado' : 'fallido';
                msg.resultado = `${enviadosOk} enviados, ${enviadosFail} fallidos`;

                // Limpiar archivo temporal si existe
                if (msg.mediaPath && fs.existsSync(msg.mediaPath)) {
                    try { fs.unlinkSync(msg.mediaPath); } catch (e) {}
                }
            }
        });
    }

    programarMensaje(data: Omit<ScheduledMessage, 'id' | 'estado' | 'creadoEn'>): ScheduledMessage {
        const scheduled: ScheduledMessage = {
            ...data,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            estado: 'pendiente',
            creadoEn: new Date().toISOString(),
        };
        this.scheduledMessages.push(scheduled);
        return scheduled;
    }

    obtenerProgramados(): ScheduledMessage[] {
        return [...this.scheduledMessages].sort((a, b) =>
            new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
        );
    }

    cancelarProgramado(id: string): boolean {
        const msg = this.scheduledMessages.find(m => m.id === id);
        if (msg && msg.estado === 'pendiente') {
            msg.estado = 'cancelado';
            if (msg.mediaPath && fs.existsSync(msg.mediaPath)) {
                try { fs.unlinkSync(msg.mediaPath); } catch (e) {}
            }
            return true;
        }
        return false;
    }
}

// Singleton
const whatsappService = new WhatsAppService();
export default whatsappService;
