import { DataTypes } from 'sequelize';

import sequelize from '../database/connection';

export const Product = sequelize.define(
    "Product",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        brand: { type: DataTypes.STRING, allowNull: false },
        category: { type: DataTypes.STRING, allowNull: false },
        price: { type: DataTypes.FLOAT, allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.INTEGER, allowNull: false },
        PcreatedAt: { type: DataTypes.DATE,field: "Pcreated",defaultValue: DataTypes.NOW, allowNull: false,},
        PupdatedAt: {type: DataTypes.DATE, field: "Pupdated", defaultValue: DataTypes.NOW,allowNull: false,},
        PdeletedAt: { type: DataTypes.DATE,field: "Pdeleted",defaultValue: DataTypes.NOW,allowNull: false,},
    },
    {
        timestamps: false,
        paranoid: false,
    }
);
