"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permiso = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
const user_1 = require("./user");
class Permiso extends sequelize_1.Model {
}
exports.Permiso = Permiso;
Permiso.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    emailPersonal: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    emailLider: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    nombre: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    numeroDocumento: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    fecha: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    tipo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    horaSalida: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    horaEntrada: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    observaciones: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    soporte: {
        type: sequelize_1.DataTypes.BLOB('long'),
        allowNull: true,
    },
    novedad: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true
    },
    cancelado: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    Uid: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.User,
            key: 'Uid',
        },
    },
}, {
    sequelize: connection_1.default,
    tableName: 'permisos',
    timestamps: false,
});
Permiso.belongsTo(user_1.User, { foreignKey: 'Uid', as: 'user' });
user_1.User.hasMany(Permiso, { foreignKey: 'Uid', as: 'permisos' });
