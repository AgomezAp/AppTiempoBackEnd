import {
  NextFunction,
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';

const validateToken = (req: Request, res: Response, next:NextFunction)=>{
    const headersToken  = req.headers['authorization']

    console.log(headersToken)
    if (headersToken != undefined && headersToken.startsWith('Bearer ')){
       try{
        const token = headersToken.slice(7);
        const decoded = jwt.verify(token,process.env.SECRET_KEY||'ptrYxZyMticytOs8eqKW17niMy8RR1JS') as any;
        (req as any).userId = decoded.userId;
        (req as any).userRole = decoded.role; // Nombre del rol como "Admin", "User", etc.
        next()
       }catch (error){
        res.status(401).json({
            msg:`La sesión ha terminado`
        })
       }
    }else{
        res.status(401).json({
            msg:`Acceso denegado`
        })
    }
  
}

export default validateToken 