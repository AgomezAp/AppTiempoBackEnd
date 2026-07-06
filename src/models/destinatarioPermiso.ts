import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

export class DestinatarioPermiso extends Model {
  public id!: number;
  public email!: string;
  public nombre!: string;
  public tipo!: 'fijo' | 'filtrado';
  public tipos_permiso!: string[];
  public es_cc!: boolean;
  public activo!: boolean;
}

DestinatarioPermiso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM('fijo', 'filtrado'),
      allowNull: false,
      defaultValue: 'fijo',
    },
    tipos_permiso: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    es_cc: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'destinatarios_permiso',
    timestamps: false,
  }
);
