"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Middleware para validar el token JWT.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @param {NextFunction} next - La función para pasar al siguiente middleware.
 * @returns {void}
 *
 * @example
 * // Ejemplo de uso:
 * // app.use(validateToken);
 */
const validateToken = (req, res, next) => {
    const headersToken = req.headers['authorization'];
    console.log(headersToken);
    if (headersToken != undefined && headersToken.startsWith('Bearer ')) {
        try {
            const token = headersToken.slice(7);
            jsonwebtoken_1.default.verify(token, process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS');
            next();
        }
        catch (error) {
            res.status(401).json({
                msg: `La sesión ha terminado`
            });
        }
    }
    else {
        res.status(401).json({
            msg: `Acceso denegado`
        });
    }
};
exports.default = validateToken;
