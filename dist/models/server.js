"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const connection_1 = __importDefault(require("../database/connection"));
const area_1 = __importDefault(require("../routes/area"));
const category_1 = __importDefault(require("../routes/category"));
const permisos_1 = __importDefault(require("../routes/permisos"));
const product_1 = __importDefault(require("../routes/product"));
const product_2 = __importDefault(require("../routes/product"));
const user_1 = __importDefault(require("../routes/user"));
const time_1 = __importDefault(require("../routes/time"));
const novedad_1 = __importDefault(require("../routes/novedad"));
const archivo_1 = __importDefault(require("../routes/archivo"));
const certificado_1 = __importDefault(require("../routes/certificado"));
const nominaConfig_1 = __importDefault(require("../routes/nominaConfig"));
const admin_1 = __importDefault(require("../routes/admin"));
const room_1 = __importDefault(require("../routes/room"));
const reservation_1 = __importDefault(require("../routes/reservation"));
const area_2 = require("./area");
const permisos_2 = require("./permisos");
const product_3 = require("./product");
const role_1 = require("./role");
const user_2 = require("./user");
const time_2 = require("./time");
const archivo_2 = require("./archivo");
const nominaConfig_2 = __importDefault(require("./nominaConfig"));
const room_2 = require("./room");
const reservation_2 = require("./reservation");
dotenv_1.default.config();
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT;
        this.middlewares();
        this.router();
        this.DBconnect();
        this.listen();
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log("Server running on port: " + this.port);
        });
    }
    router() {
        this.app.use(user_1.default);
        this.app.use(product_1.default);
        this.app.use(category_1.default);
        this.app.use(product_2.default);
        this.app.use(permisos_1.default);
        this.app.use(area_1.default);
        this.app.use(time_1.default);
        this.app.use(novedad_1.default);
        this.app.use('/api/archivos', archivo_1.default);
        this.app.use('/api/certificados', certificado_1.default);
        this.app.use('/api/nomina-config', nominaConfig_1.default);
        this.app.use('/api/admin', admin_1.default);
        this.app.use(room_1.default);
        this.app.use(reservation_1.default);
    }
    middlewares() {
        // CORS debe ir ANTES de express.json() y cualquier otra cosa
        this.app.use((0, cors_1.default)({
            origin: '*', // Permite todas las solicitudes de origen cruzado
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos permitidos (incluir OPTIONS)
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
            credentials: true,
            optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) tienen problemas con 204
        }));
        // Middleware adicional para asegurar headers CORS en todas las respuestas
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            res.header('Access-Control-Allow-Credentials', 'true');
            // Maneja las solicitudes OPTIONS (preflight)
            if (req.method === 'OPTIONS') {
                res.status(200).end();
            }
            else {
                next();
            }
        });
        this.app.use(express_1.default.json());
        // Servir archivos estáticos
        this.app.use('/uploads', express_1.default.static('public/uploads'));
        this.app.use('/public', express_1.default.static('public'));
    }
    DBconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                /* {force: true}{alter: true} */
                yield connection_1.default.authenticate();
                yield role_1.Role.sync();
                yield area_2.Area.sync({ alter: false });
                yield user_2.User.sync({ alter: false });
                yield product_3.Product.sync();
                yield permisos_2.Permiso.sync({ alter: false });
                // await Registro.sync({force: false});
                // await Sumatoria.sync({force: false});
                yield time_2.Registro.sync();
                yield time_2.Sumatoria.sync();
                yield time_2.Novedad.sync({ alter: false });
                yield time_2.NovedadHistorico.sync({ alter: false });
                yield archivo_2.Archivo.sync({ alter: false });
                yield nominaConfig_2.default.sync({ alter: false });
                const { Alert } = yield Promise.resolve().then(() => __importStar(require('./alert')));
                yield Alert.sync({ alter: false });
                yield room_2.Room.sync({ alter: false });
                yield reservation_2.Reservation.sync({ alter: false });
                console.log('Conexión establecida correctamente');
            }
            catch (error) {
                console.log("Error de conexion");
            }
        });
    }
}
exports.default = Server;
