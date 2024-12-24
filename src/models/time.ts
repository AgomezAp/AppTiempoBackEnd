import { DataTypes } from 'sequelize';

import sequelize from '../database/connection';

export const Registro = sequelize.define(
    "Registro",
    {
        ID: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement:false},
        Name: {type: DataTypes.STRING, allowNull: false},
        Entrada: {type: DataTypes.DATE, allowNull: false},
        Salida: {type: DataTypes.DATE, allowNull: false},
        Fecha: {type: DataTypes.DATE, allowNull: false},
        Extra: {type: DataTypes.STRING, allowNull: false}
    },
    {
        timestamps: false,
        paranoid: false,
    }

);
