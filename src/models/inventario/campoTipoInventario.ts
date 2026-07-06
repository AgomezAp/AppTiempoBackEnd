import { Model, DataTypes } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';
import { TipoInventario } from './consumibles';

export class CampoTipoInventario extends Model {
  public id!: number;
  public tipoInventarioId!: number;
  public nombre!: string;
  public clave!: string;
  public tipo_campo!: 'texto' | 'numero' | 'fecha' | 'booleano';
  public requerido!: boolean;
  public orden!: number;
  public activo!: boolean;
}

CampoTipoInventario.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipoInventarioId: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING, allowNull: false },
  clave: { type: DataTypes.STRING, allowNull: false },
  tipo_campo: { type: DataTypes.ENUM('texto', 'numero', 'fecha', 'booleano'), defaultValue: 'texto' },
  requerido: { type: DataTypes.BOOLEAN, defaultValue: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize: sequelizeInventario,
  tableName: 'campos_tipo_inventario',
  timestamps: true,
});

CampoTipoInventario.belongsTo(TipoInventario, { foreignKey: 'tipoInventarioId', as: 'tipoInventario' });
TipoInventario.hasMany(CampoTipoInventario, { foreignKey: 'tipoInventarioId', as: 'campos' });

export default CampoTipoInventario;
