import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

export class NominaConfig extends Model {
  public id!: number;
  public salarioMinimo!: number;
  public auxilioTransporte!: number;
  public porcentajeSalud!: number;
  public porcentajePension!: number;
  public anio!: number;
  public vigente!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NominaConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    salarioMinimo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'salario_minimo',
      comment: 'Salario Mínimo Legal Mensual Vigente (SMLMV)'
    },
    auxilioTransporte: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'auxilio_transporte',
      comment: 'Valor del auxilio de transporte'
    },
    porcentajeSalud: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.04,
      field: 'porcentaje_salud',
      comment: 'Porcentaje de aporte a salud del trabajador (0.04 = 4%)'
    },
    porcentajePension: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.04,
      field: 'porcentaje_pension',
      comment: 'Porcentaje de aporte a pensión del trabajador (0.04 = 4%)'
    },
    anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'anio',
      comment: 'Año de vigencia de la configuración'
    },
    vigente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'vigente',
      comment: 'Indica si esta configuración es la activa actualmente'
    },
  },
  {
    sequelize,
    tableName: 'nomina_config',
    timestamps: true,
  }
);

export default NominaConfig;
