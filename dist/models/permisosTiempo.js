"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermisosTiempo = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
exports.PermisosTiempo = connection_1.default.define('PermisosTiempo', {
    Pid: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, },
    nombre: { type: sequelize_1.DataTypes.STRING, allowNull: false, },
    tipoPermiso: { type: sequelize_1.DataTypes.STRING, allowNull: false, },
    correoPersonal: { type: sequelize_1.DataTypes.STRING, allowNull: false, },
    correoLider: { type: sequelize_1.DataTypes.STRING, allowNull: false, },
    horaSalida: { type: sequelize_1.DataTypes.DATE, allowNull: false, },
    horaEntrada: { type: sequelize_1.DataTypes.DATE, allowNull: false, },
    fecha: { type: sequelize_1.DataTypes.DATE, allowNull: false, },
    observacion: { type: sequelize_1.DataTypes.STRING, allowNull: true, },
    soporte: { type: sequelize_1.DataTypes.STRING, allowNull: true, },
    uniqueKey: { type: sequelize_1.DataTypes.STRING, allowNull: false, unique: true, },
}, {
    timestamps: false,
    paranoid: false,
});
exports.default = exports.PermisosTiempo;
