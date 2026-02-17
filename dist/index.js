"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // DEBE ser la primera línea - carga .env antes de todo
const server_1 = __importDefault(require("./models/server"));
require("./utils/cron");
const server = new server_1.default();
