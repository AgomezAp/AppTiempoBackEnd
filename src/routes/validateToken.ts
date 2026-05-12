import {
  NextFunction,
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export const validateToken = (req: Request, res: Response, next: NextFunction): void => {
    const headersToken = req.headers['authorization'];
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';

    let token: string | undefined;

    if (headersToken != undefined && headersToken.startsWith('Bearer ')) {
        token = headersToken.slice(7);
    } else if (queryToken && queryToken.trim() !== '') {
        token = queryToken;
    }

    if (!token) {
        logger.warn({ event: 'ACCESS_NO_TOKEN', ip, url: req.originalUrl, method: req.method });
        res.status(401).json({ msg: 'Acceso denegado' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY!) as any;
        (req as any).userId = decoded.userId;
        (req as any).userRole = decoded.role;
        next();
    } catch (error: any) {
        const isExpired = error.name === 'TokenExpiredError';
        logger.warn({
            event: isExpired ? 'ACCESS_TOKEN_EXPIRED' : 'ACCESS_TOKEN_INVALID',
            ip,
            url: req.originalUrl,
            method: req.method,
        });
        res.status(401).json({ msg: 'La sesión ha terminado' });
    }
}

export const validateAdmin = (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole;
    if (role === 'Admin' || role === 'Tecnologia') {
        next();
    } else {
        res.status(403).json({ msg: 'Acceso restringido: se requiere rol Admin o Tecnologia' });
    }
};

// Permite Admin, Tecnologia y RRHH
export const validateRRHH = (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole;
    if (role === 'Admin' || role === 'Tecnologia' || role === 'RRHH') {
        next();
    } else {
        res.status(403).json({ msg: 'Acceso restringido: se requiere rol Admin o RRHH' });
    }
};

export default validateToken;
