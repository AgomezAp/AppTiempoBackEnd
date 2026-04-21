import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

// Modelo para el registro de asistencia (el acta principal)
export class RegistroAsistencia extends Model {
  public id!: number;
  public fecha!: Date;
  public tema!: string;
  public facilitadorId!: number;
  public facilitadorNombre!: string;
  public codigo!: string;
  public version!: string;
  public estado!: 'pendiente' | 'en_proceso' | 'completado';
  public createdAt!: Date;
  public updatedAt!: Date;
}

RegistroAsistencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tema: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    facilitadorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    facilitadorNombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'GH-FOR-046',
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '03',
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_proceso', 'completado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
  },
  {
    sequelize,
    tableName: 'registros_asistencia',
    timestamps: true,
  }
);

// Modelo para los participantes de cada registro
export class ParticipanteAsistencia extends Model {
  public id!: number;
  public registroId!: number;
  public usuarioId!: number | null;
  public nombreCompleto!: string;
  public documentoIdentificacion!: string;
  public cargo!: string;
  public empresa!: string;
  public email!: string;
  public firma!: string | null; // Base64 de la imagen de firma
  public fechaFirma!: Date | null;
  public tokenFirma!: string;
  public firmado!: boolean;
  public esExterno!: boolean;
  public cancelado!: boolean;
  public anulado!: boolean;
  public fechaCancelacion!: Date | null;
  public motivoCancelacion!: string | null;
}

ParticipanteAsistencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    registroId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'registros_asistencia',
        key: 'id',
      },
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    nombreCompleto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentoIdentificacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cargo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'AP',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firma: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tokenFirma: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    firmado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    esExterno: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    cancelado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    anulado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fechaCancelacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    motivoCancelacion: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'participantes_asistencia',
    timestamps: true,
  }
);

// Relaciones
RegistroAsistencia.hasMany(ParticipanteAsistencia, {
  foreignKey: 'registroId',
  as: 'participantes',
});

ParticipanteAsistencia.belongsTo(RegistroAsistencia, {
  foreignKey: 'registroId',
  as: 'registro',
});

RegistroAsistencia.belongsTo(User, {
  foreignKey: 'facilitadorId',
  as: 'facilitador',
});

ParticipanteAsistencia.belongsTo(User, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});
