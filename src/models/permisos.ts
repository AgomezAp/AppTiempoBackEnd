import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { User } from './user';

export class Permiso extends Model {
  public id!: number;
  public emailPersonal!: string;
  public emailLider!: string;
  public nombre!: string;
  public numeroDocumento!: string;
  public fechaInicio!: Date;
  public fechaFin!: Date;
  public tipo!: string;
  public horaSalida!: string;
  public horaRegreso!: string;
  public observaciones?: string;
  public soporte?: Buffer;
  public Uid!: number; // Foreign key to User
}

Permiso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    emailPersonal: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emailLider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroDocumento: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fechaFin: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    horaSalida: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    horaRegreso: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    soporte: {
      type: DataTypes.BLOB('long'),
      allowNull: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'Uid',
      },
    },
  },
  {
    sequelize,
    tableName: 'permisos',
    timestamps: false,
  }
);

Permiso.belongsTo(User, { foreignKey: 'Uid', as: 'user' });
User.hasMany(Permiso, { foreignKey: 'Uid', as: 'permisos' });