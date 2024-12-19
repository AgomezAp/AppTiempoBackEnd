import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { User } from './user';

export class Permiso extends Model {
  public id!: number;
  public tipo!: string;
  public descripcion!: string;
  public fechaInicio!: Date;
  public fechaFin!: Date;
  public horas!: number;
  public Uid!: number; // Foreign key to User
}

Permiso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
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
    horas: {
      type: DataTypes.INTEGER,
      allowNull: false,
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