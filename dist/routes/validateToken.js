"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validateToken = (req, res, next) => {
    const headersToken = req.headers['authorization'];
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    let token;
    if (headersToken != undefined && headersToken.startsWith('Bearer ')) {
        token = headersToken.slice(7);
    }
    else if (queryToken && queryToken.trim() !== '') {
        token = queryToken;
    }
    if (!token) {
        res.status(401).json({
            msg: `Acceso denegado`
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS');
        req.userId = decoded.userId;
        req.userRole = decoded.role; // Nombre del rol como "Admin", "User", etc.
        next();
    }
    catch (error) {
        res.status(401).json({
            msg: `La sesión ha terminado`
        });
    }
};
exports.default = validateToken;
