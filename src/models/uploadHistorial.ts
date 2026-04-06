import { DataTypes } from 'sequelize';
import sequelize from '../database/connection';

export const UploadHistorial = sequelize.define(
    "UploadHistorial",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fechaSubida: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        archivoNombre: { type: DataTypes.STRING, allowNull: true },
        rangoInicio: { type: DataTypes.DATEONLY, allowNull: false },
        rangoFin: { type: DataTypes.DATEONLY, allowNull: false },
        cantidadRegistros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        // Snapshot de los deltas extras que se sumaron en esta subida, para poder revertirlos
        deltaExtras: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        estado: { 
            type: DataTypes.ENUM('activo', 'revertido'), 
            allowNull: false, 
            defaultValue: 'activo' 
        },
    },
    {
        timestamps: true,
        paranoid: false,
        tableName: "upload_historial",
    }
);
