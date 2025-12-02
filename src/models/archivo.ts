import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';

export class Archivo extends Model {
  public Aid!: number;
  public nombre!: string;
  public descripcion!: string;
  public url!: string;
  public tipo!: string; // pdf, video, imagen, etc
  public categoria!: string; // certificados, videos_empresa, documentos, etc
  public fechaSubida!: Date;
  public estado!: number; // 1 activo, 0 inactivo
}

Archivo.init(
  {
    Aid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fechaSubida: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: "archivos",
    timestamps: false,
  }
);
