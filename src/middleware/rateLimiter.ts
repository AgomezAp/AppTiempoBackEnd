import rateLimit from 'express-rate-limit';

// Limitador global: 300 req por IP cada 15 minutos
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Demasiadas solicitudes desde esta IP. Intente de nuevo en 15 minutos.' },
});

// Limitador estricto para login: 10 intentos por IP cada 15 minutos
// skipSuccessfulRequests: los logins exitosos no consumen cupo
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Demasiados intentos de inicio de sesión. Cuenta bloqueada temporalmente por 15 minutos.' },
    skipSuccessfulRequests: true,
});
