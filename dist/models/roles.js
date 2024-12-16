"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
exports.Role = connection_1.default.define("rol", {
    Rid: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Rname: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    Rstatus: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    RcreatedAt: { type: sequelize_1.DataTypes.DATE, field: 'Rcreated', defaultValue: sequelize_1.DataTypes.NOW, allowNull: false },
    RupdatedAt: { type: sequelize_1.DataTypes.DATE, field: 'Rupdated', defaultValue: sequelize_1.DataTypes.NOW, allowNull: false },
    RdeletedAt: { type: sequelize_1.DataTypes.DATE, field: 'Rdeleted', defaultValue: sequelize_1.DataTypes.NOW, allowNull: false }
}, {
    timestamps: false,
    paranoid: false
});
