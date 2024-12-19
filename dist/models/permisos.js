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
    tipo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    descripcion: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    fechaInicio: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    fechaFin: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    horas: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
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
