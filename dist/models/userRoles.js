"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHasRoles = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
exports.userHasRoles = connection_1.default.define("userRoles", {
    Uid: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true },
    Rid: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true }
});
