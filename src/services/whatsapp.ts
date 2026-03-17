import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';

type SessionStatus = 'disconnected' | 'qr_pending' | 'loading' | 'ready';

class WhatsAppService {
    private client: Client | null = null;
    private qrCodeDataUrl: string | null = null;
    private status: SessionStatus = 'disconnected';
    private lastError: string | null = null;
    private sseClients: Set<any> = new Set();

    getStatus(): SessionStatus {
        return this.status;
    }

    getQRCode(): string | null {
        return this.qrCodeDataUrl;
    }

    getLastError(): string | null {
        return this.lastError;
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
}

// Singleton
const whatsappService = new WhatsAppService();
export default whatsappService;
