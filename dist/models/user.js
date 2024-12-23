"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
const area_1 = require("./area");
const role_1 = require("./role");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    Uid: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    Rid: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    Aid: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    sequelize: connection_1.default,
    tableName: "users",
    timestamps: false,
});
User.belongsTo(role_1.Role, { foreignKey: "Rid", as: "role" });
role_1.Role.hasMany(User, { foreignKey: "Rid", as: "users" });
User.belongsTo(area_1.Area, { foreignKey: 'Aid', as: 'area' });
area_1.Area.hasMany(User, { foreignKey: 'Aid', as: 'users' });
