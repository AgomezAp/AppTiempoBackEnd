import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { Role } from './role';

export class User extends Model {
  public Uid!: number;
  public name!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public status!: number;
  public Rid!: number;

  public role?: Role;
}

User.init(
  {
    Uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Rid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
  }
);

User.belongsTo(Role, { foreignKey: 'Rid', as: 'role' });
Role.hasMany(User, { foreignKey: 'Rid', as: 'users' });