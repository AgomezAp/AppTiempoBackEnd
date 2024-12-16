import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';

export class Role extends Model {
  public Rid!: number;
  public Rname!: string;
}

Role.init(
  {
    Rid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Rname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: false,
  }
);