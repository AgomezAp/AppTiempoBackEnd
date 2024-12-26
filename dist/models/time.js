"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registro = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
exports.Registro = connection_1.default.define("Registro", {
    ID: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: false },
    Name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    Entrada: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Salida: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Fecha: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Extra: { type: sequelize_1.DataTypes.STRING, allowNull: false }
}, {
    timestamps: false,
    paranoid: false,
});
