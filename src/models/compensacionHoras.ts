import { DataTypes } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export const CompensacionHoras = sequelize.define(
  'CompensacionHoras',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'Uid' },
    },
    nombreEmpleado: { type: DataTypes.STRING, allowNull: false },
    cargo: { type: DataTypes.STRING, allowNull: true },
    mesGenerador: { type: DataTypes.STRING, allowNull: false },
    mesCompensacion: { type: DataTypes.STRING, allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    horasAcumuladas: { type: DataTypes.STRING, allowNull: true },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    filas: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  },
  {
    timestamps: true,
    paranoid: false,
  }
);

User.hasMany(CompensacionHoras, { foreignKey: 'Uid', as: 'planesCompensacion' });
CompensacionHoras.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
