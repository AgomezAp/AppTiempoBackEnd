import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export interface ActaRecargaAttributes {
  id?: number;
  periodoInicio: Date;
  periodoFin: Date;
  anio: number;
  totalRequeridoProyectado: number | null;
  totalIngresadoTarjetas: number | null;
  totalRecargadoGoogleAds: number | null;
  totalReportadoFormularios: number | null;
  firmaEmisor: string | null;
  firmaRevisor: string | null;
  firmaEmisorImagen: string | null;
  firmaRevisorImagen: string | null;
  fechaFirmaEmisor: Date | null;
  fechaFirmaRevisor: Date | null;
  estado: 'borrador' | 'pendiente_revision' | 'firmado' | 'completado';
  emisorId: number;
  revisorId: number;
  tokenFirma: string | null;
  tokenExpiracion: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ActaRecarga extends Model<ActaRecargaAttributes> implements ActaRecargaAttributes {
  public id!: number;
  public periodoInicio!: Date;
  public periodoFin!: Date;
  public anio!: number;
  public totalRequeridoProyectado!: number | null;
  public totalIngresadoTarjetas!: number | null;
  public totalRecargadoGoogleAds!: number | null;
  public totalReportadoFormularios!: number | null;
  public firmaEmisor!: string | null;
  public firmaRevisor!: string | null;
  public firmaEmisorImagen!: string | null;
  public firmaRevisorImagen!: string | null;
  public fechaFirmaEmisor!: Date | null;
  public fechaFirmaRevisor!: Date | null;
  public estado!: 'borrador' | 'pendiente_revision' | 'firmado' | 'completado';
  public emisorId!: number;
  public revisorId!: number;
  public tokenFirma!: string | null;
  public tokenExpiracion!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public emisor?: User;
  public revisor?: User;
}

ActaRecarga.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    periodoInicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    periodoFin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalRequeridoProyectado: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Total Requerido Proyectado - Lo coloca el emisor',
    },
    totalIngresadoTarjetas: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Total Ingresado a las Tarjetas - Lo coloca el emisor',
    },
    totalRecargadoGoogleAds: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Total Recargado Google ADS - Lo coloca el emisor',
    },
    totalReportadoFormularios: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Total reportado en formularios de recarga - Lo coloca el emisor',
    },
    firmaEmisor: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre de quien certifica los montos (emisor)',
    },
    firmaRevisor: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre de quien recibe y valida (revisor)',
    },
    firmaEmisorImagen: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Imagen de firma del emisor en base64',
    },
    firmaRevisorImagen: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Imagen de firma del revisor en base64',
    },
    fechaFirmaEmisor: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaFirmaRevisor: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('borrador', 'pendiente_revision', 'firmado', 'completado'),
      allowNull: false,
      defaultValue: 'borrador',
    },
    emisorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    revisorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    tokenFirma: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Token para firmar el acta por correo',
    },
    tokenExpiracion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ActaRecarga',
    tableName: 'actas_recargas',
    timestamps: true,
  }
);

// Relaciones
ActaRecarga.belongsTo(User, { as: 'emisor', foreignKey: 'emisorId' });
ActaRecarga.belongsTo(User, { as: 'revisor', foreignKey: 'revisorId' });

export default ActaRecarga;
