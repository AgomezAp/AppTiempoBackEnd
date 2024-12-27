"use strict";
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
const area_2 = require("./area");
const permisos_2 = require("./permisos");
const product_3 = require("./product");
const role_1 = require("./role");
const user_2 = require("./user");
dotenv_1.default.config();
/**
 * Clase Server para configurar y ejecutar el servidor.
 */
class Server {
    /**
   * Constructor de la clase Server.
   *
   * @param {string} port - El puerto en el que el servidor escuchará las solicitudes.
   */
    constructor() {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT;
        this.middlewares();
        this.router();
        this.DBconnect();
        this.listen();
    }
    /**
     * Inicia el servidor.
     */
    listen() {
        this.app.listen(this.port, () => {
            console.log("Server running on port: " + this.port);
        });
    }
    /**
     * Configura las rutas del servidor.
     */
    router() {
        this.app.use(user_1.default);
        this.app.use(product_1.default);
        this.app.use(category_1.default);
        this.app.use(product_2.default);
        this.app.use(permisos_1.default);
        this.app.use(area_1.default);
        this.app.get('/api/test-timeout', (req, res) => {
            setTimeout(() => {
                res.send('This request should timeout if the timeout middleware is working.');
            }, 70000); // 70 segundos (más de 1 minuto)
        });
    }
    /**
    * Configura los middlewares del servidor.
    */
    middlewares() {
        this.app.use(express_1.default.json());
        this.app.use((0, cors_1.default)({
            origin: '*', // Permite todas las solicitudes de origen cruzado
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos permitidos
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        this.app.use((req, res, next) => {
            res.setTimeout(60000, () => {
                console.log('Request has timed out.');
                res.status(408).send('Request has timed out.');
            });
            next();
        });
    }
    /**
     * Conecta a la base de datos y sincroniza los modelos.
     *
     * @returns {Promise<void>} - Una promesa que se resuelve si la conexión y sincronización son exitosas.
     */
    DBconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                /* {force: true}{alter: true} */
                yield connection_1.default.authenticate();
                yield role_1.Role.sync();
                yield area_2.Area.sync({ alter: true });
                yield user_2.User.sync();
                yield product_3.Product.sync({ alter: true });
                yield permisos_2.Permiso.sync();
                console.log('Conexión establecida correctamente');
            }
            catch (error) {
                console.log("Error de conexion");
            }
        });
    }
}
exports.default = Server;
