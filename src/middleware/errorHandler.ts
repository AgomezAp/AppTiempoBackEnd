import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
    const statusCode: number = err.statusCode || err.status || 500;

    logger.error({
        message: err.message,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.socket?.remoteAddress,
        userId: (req as any).userId ?? null,
    });

    // Errores de CORS: no revelar la lista de orígenes permitidos
    if (err.message?.includes('not allowed by CORS') || err.message?.includes('no permitido por CORS')) {
        res.status(403).json({ msg: 'Origen no permitido' });
        return;
    }

    // Para errores 5xx nunca exponer detalles internos al cliente
    res.status(statusCode).json({
        msg: statusCode >= 500 ? 'Error interno del servidor' : err.message,
    });
};
