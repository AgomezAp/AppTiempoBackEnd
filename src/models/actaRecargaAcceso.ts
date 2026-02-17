import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export interface ActaRecargaAccesoAttributes {
  id?: number;
  usuarioId: number;
  puedeVer: boolean;
  puedeEditar: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ActaRecargaAcceso extends Model<ActaRecargaAccesoAttributes> implements ActaRecargaAccesoAttributes {
  public id!: number;
  public usuarioId!: number;
  public puedeVer!: boolean;
  public puedeEditar!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public usuario?: User;
}

ActaRecargaAcceso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    puedeVer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    puedeEditar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'ActaRecargaAcceso',
    tableName: 'actas_recargas_accesos',
    timestamps: true,
  }
);

ActaRecargaAcceso.belongsTo(User, { as: 'usuario', foreignKey: 'usuarioId' });

export default ActaRecargaAcceso;
