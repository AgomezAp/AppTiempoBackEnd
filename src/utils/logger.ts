import fs from 'fs';
import path from 'path';
import winston from 'winston';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${extras}`;
    })
);

const logger = winston.createLogger({
    level: 'http',
    format: jsonFormat,
    transports: [
        // Errores críticos
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
        }),
        // Eventos de seguridad (warn+): logins fallidos, accesos denegados
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            level: 'warn',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
        }),
        // Todo (http requests, info, warn, error)
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
        }),
        new winston.transports.Console({ format: consoleFormat }),
    ],
});

// Stream para Morgan → Winston
export const morganStream = {
    write: (message: string) => logger.http(message.trim()),
};

export default logger;
