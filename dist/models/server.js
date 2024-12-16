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
const express_1 = __importDefault(require("express"));
const category_1 = __importDefault(require("../routes/category"));
const product_1 = __importDefault(require("../routes/product"));
const product_2 = __importDefault(require("../routes/product"));
const user_1 = __importDefault(require("../routes/user"));
const product_3 = require("./product");
const role_1 = require("./role");
const user_2 = require("./user");
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT;
        this.listen();
        this.middlewares();
        this.router();
        this.DBconnect();
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log("This execute froam port: " + this.port);
        });
    }
    router() {
        this.app.use(user_1.default);
        this.app.use(product_1.default);
        this.app.use(category_1.default);
        this.app.use(product_2.default);
    }
    middlewares() {
        this.app.use(express_1.default.json());
        this.app.use((0, cors_1.default)());
    }
    DBconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                /* {force: true}{alter: true} */
                yield user_2.User.sync();
                yield product_3.Product.sync({ alter: true });
                yield role_1.Role.sync();
                console.log('la tabla para el usuario fue creada');
                console.log("Conexion exitosa");
            }
            catch (error) {
                console.log("Error de conexion");
            }
        });
    }
}
exports.default = Server;
