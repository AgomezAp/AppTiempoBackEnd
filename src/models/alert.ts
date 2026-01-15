import { DataTypes } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export const Alert = sequelize.define(
  'Alert',
  {
    Aid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Uid: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'Uid' } },
    Name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    minutes: { type: DataTypes.INTEGER, allowNull: false },
    periodoInicio: { type: DataTypes.DATE, allowNull: false },
    periodoFin: { type: DataTypes.DATE, allowNull: false },
    notified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: new Date() },
  },
  {
    timestamps: false,
    paranoid: false,
    tableName: 'alerts',
  }
);

User.hasMany(Alert, { foreignKey: 'Uid', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });

export default Alert;
