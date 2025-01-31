"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Novedad = exports.Sumatoria = exports.Registro = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
const user_1 = require("./user");
exports.Registro = connection_1.default.define("Registro", {
    unique_key: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Hid: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, references: { model: user_1.User, key: "Uid" } },
    Name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    Entrada: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Salida: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Fecha: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    Extra: { type: sequelize_1.DataTypes.STRING, allowNull: false }
}, {
    timestamps: false,
    paranoid: false,
});
user_1.User.hasMany(exports.Registro, { foreignKey: "Hid", as: "registros" });
exports.Registro.belongsTo(user_1.User, { foreignKey: "Hid", as: "usuario" });
exports.Sumatoria = connection_1.default.define("Sumatoria", {
    Sid: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, references: { model: user_1.User, key: "Uid" } },
    Name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    Acumulado: { type: sequelize_1.DataTypes.STRING, allowNull: false }
}, {
    timestamps: false,
    paranoid: false,
});
user_1.User.hasOne(exports.Sumatoria, { foreignKey: "Sid", as: "sumatoria" });
exports.Sumatoria.belongsTo(user_1.User, { foreignKey: "Sid", as: "usuario" });
exports.Novedad = connection_1.default.define("Novedad", {
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true },
    Nid: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, references: { model: user_1.User, key: "Uid" } },
    Name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    Fecha: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    HoraEntrada: { type: sequelize_1.DataTypes.STRING, allowNull: true }, //revisar el allow
    HoraSalida: { type: sequelize_1.DataTypes.STRING, allowNull: true }, //revisar el allow
    description: { type: sequelize_1.DataTypes.STRING, allowNull: true }, //revisar el allow
    horas: { type: sequelize_1.DataTypes.STRING, allowNull: true }, //revisar el allow
    aceptacion: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: true } //revisar el allow
}, {
    timestamps: false,
    paranoid: false,
});
user_1.User.hasMany(exports.Novedad, { foreignKey: "Nid", as: "novedades" });
exports.Novedad.belongsTo(user_1.User, { foreignKey: "Nid", as: "usuario" });
