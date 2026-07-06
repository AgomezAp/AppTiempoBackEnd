import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export class PlantillaInventario extends Model {
  public id!: number;
  public nombre!: string;
  public descripcion!: string | null;
  public activo!: boolean;
}

PlantillaInventario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'plantillas_inventario',
    timestamps: true,
  }
);

export class ItemPlantilla extends Model {
  public id!: number;
  public plantillaId!: number;
  public nombre!: string;
  public categoria!: string;
  public cantidad!: number;
  public unidad!: string;
  public descripcion!: string | null;
}

ItemPlantilla.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    plantillaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: PlantillaInventario, key: 'id' },
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'otro',
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unidad: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'unidad',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'items_plantilla',
    timestamps: false,
  }
);

export class InventarioUsuario extends Model {
  public id!: number;
  public Uid!: number;
  public plantillaId!: number;
  public fechaAsignacion!: Date;
  public observaciones!: string | null;
  public estado!: 'activo' | 'inactivo';
}

InventarioUsuario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'Uid' },
    },
    plantillaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: PlantillaInventario, key: 'id' },
    },
    fechaAsignacion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    sequelize,
    tableName: 'inventarios_usuario',
    timestamps: false,
  }
);

// Asociaciones
PlantillaInventario.hasMany(ItemPlantilla, { foreignKey: 'plantillaId', as: 'items' });
ItemPlantilla.belongsTo(PlantillaInventario, { foreignKey: 'plantillaId', as: 'plantilla' });

PlantillaInventario.hasMany(InventarioUsuario, { foreignKey: 'plantillaId', as: 'asignaciones' });
InventarioUsuario.belongsTo(PlantillaInventario, { foreignKey: 'plantillaId', as: 'plantilla' });

User.hasMany(InventarioUsuario, { foreignKey: 'Uid', as: 'inventarios' });
InventarioUsuario.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
