import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { Area } from './area';
import { Role } from './role';

export class User extends Model {
  public Uid!: number;
  public name!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public status!: number;
  public Rid!: number;
  public Aid!: number;
  public salario!: number;
  public empresa!: 'AP' | 'AT' | 'ME';
  public documentoIdentificacion!: string;
  public fondoPension!: string;
  public fondoCesantias!: string;
  public cargo!: string;
  public tipoContrato!: 'termino-indefinido' | 'termino-fijo';
  public certificadosGenerados!: number;
  public fechaIngreso!: Date;

}

User.init(
  {
    Uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      // autoIncrement: true,
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
    Aid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    salario: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    empresa: {  
      type: DataTypes.ENUM('AP', 'AT', 'ME'),
      allowNull: true,
      defaultValue: 'AP',
    },
    documentoIdentificacion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    fondoPension: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'PORVENIR',
    },
    fondoCesantias: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'PORVENIR',
    },
    cargo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    tipoContrato: {
      type: DataTypes.ENUM('termino-indefinido', 'termino-fijo'),
      allowNull: true,
      defaultValue: 'termino-indefinido',
    },
    certificadosGenerados: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    fechaIngreso: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  }
);

User.belongsTo(Role, { foreignKey: "Rid", as: "role" });
Role.hasMany(User, { foreignKey: "Rid", as: "users" });

User.belongsTo(Area, {foreignKey: 'Aid',as: 'area'});
Area.hasMany(User, {foreignKey: 'Aid',as: 'users'});