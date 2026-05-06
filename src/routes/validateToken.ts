import {
  NextFunction,
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';

export const validateToken = (req: Request, res: Response, next:NextFunction)=>{
    const headersToken = req.headers['authorization'];
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

    let token: string | undefined;

    if (headersToken != undefined && headersToken.startsWith('Bearer ')) {
        token = headersToken.slice(7);
    } else if (queryToken && queryToken.trim() !== '') {
        token = queryToken;
    }

    if (!token) {
        res.status(401).json({
            msg:`Acceso denegado`
        });
        return;
    }

    try{
        const decoded = jwt.verify(token,process.env.SECRET_KEY||'ptrYxZyMticytOs8eqKW17niMy8RR1JS') as any;
        (req as any).userId = decoded.userId;
        (req as any).userRole = decoded.role;
        next();
    }catch (error){
        res.status(401).json({
            msg:`La sesión ha terminado`
        });
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
