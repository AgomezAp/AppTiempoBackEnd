import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';

export class Area extends Model {
  public Aid!: number;
  public name!: string;
  public Uid!: number;
}

Area.init(
  {
    Aid: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Aname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correoLider: {
      type: DataTypes.STRING,
      allowNull: false,
    },

  },
  {
    sequelize,
    tableName: 'areas',
    timestamps: false,
  }
);

