import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';

export class Room extends Model {
  public Rid!: number;
  public name!: string;
}

Room.init(
  {
    Rid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'rooms',
    timestamps: true,
  }
);

export default Room;
