"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
exports.Product = connection_1.default.define("Product", {
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    brand: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    category: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    quantity: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    status: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    qrCode: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: false },
    PcreatedAt: { type: sequelize_1.DataTypes.DATE, field: "Pcreated", defaultValue: sequelize_1.DataTypes.NOW, allowNull: false, },
    PupdatedAt: { type: sequelize_1.DataTypes.DATE, field: "Pupdated", defaultValue: sequelize_1.DataTypes.NOW, allowNull: false, },
    PdeletedAt: { type: sequelize_1.DataTypes.DATE, field: "Pdeleted", defaultValue: sequelize_1.DataTypes.NOW, allowNull: false, },
}, {
    timestamps: false,
    paranoid: false,
});
