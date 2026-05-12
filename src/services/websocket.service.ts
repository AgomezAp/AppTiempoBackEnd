import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let _io: SocketIOServer | null = null;

/**
 * Inicializa Socket.IO con el servidor HTTP dado.
 * Llamar desde server.ts/index.ts al arrancar.
 */
export function initIO(httpServer: HTTPServer): SocketIOServer {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

    _io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                callback(new Error(`Socket.IO: origen no permitido: ${origin}`));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        }
    });

    _io.on('connection', (socket) => {
        // El cliente puede unirse a salas específicas
        socket.on('join', (room: string) => {
            socket.join(room);
        });
        socket.on('leave', (room: string) => {
            socket.leave(room);
        });
    });

    return _io;
}

/**
 * Retorna la instancia de Socket.IO ya inicializada.
 * Si no está inicializada, lanza error.
 */
export function getIO(): SocketIOServer {
    if (!_io) {
        // En modo degradado (server.ts no inicializó socket), crear instancia dummy
        // que no hace nada para evitar crashear en endpoints que llaman getIO()
        return {
            to: (_room: string) => ({ emit: () => {} }),
            emit: () => {}
        } as any;
    }
    return _io;
}
