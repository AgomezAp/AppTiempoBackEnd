import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { User } from './user';
import { Room } from './room';

export class Reservation extends Model {
  public ReservationId!: number;
  public Uid!: number;
  public Rid!: number;
  public date!: string; // YYYY-MM-DD
  public startTime!: string; // HH:mm
  public endTime!: string; // HH:mm
  public reason!: string;
  public participants!: number[]; // Array de Uid
}

Reservation.init(
  {
    ReservationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'Uid',
      },
    },
    Rid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Room,
        key: 'Rid',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    participants: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'reservations',
    timestamps: true,
  }
);

// Relaciones
Reservation.belongsTo(User, { foreignKey: 'Uid' });
Reservation.belongsTo(Room, { foreignKey: 'Rid' });

export default Reservation;
