import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

// ========================================
// MODELOS SSGT - Sistema de Seguridad y Salud en el Trabajo
// ========================================

// Modelo principal: Accidentes e Incidentes
export class AccidenteIncidente extends Model {
  public id!: number;
  public fecha!: string;
  public hora!: string;
  public lugar!: string;
  public descripcion!: string;
  public tipoEvento!: 'accidente' | 'incidente';
  public severidad!: 'leve' | 'grave' | 'mortal';
  public tipoLesion!: string | null;
  public parteAfectada!: string | null;
  public testigos!: string | null;
  public diasIncapacidad!: number | null;
  public reportadoPor!: number;
  public estado!: 'reportado' | 'en_investigacion' | 'cerrado';
  public empresa!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

AccidenteIncidente.init(
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
    hora: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lugar: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tipoEvento: {
      type: DataTypes.ENUM('accidente', 'incidente'),
      allowNull: false,
    },
    severidad: {
      type: DataTypes.ENUM('leve', 'grave', 'mortal'),
      allowNull: false,
    },
    tipoLesion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parteAfectada: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    testigos: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diasIncapacidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reportadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    estado: {
      type: DataTypes.ENUM('reportado', 'en_investigacion', 'cerrado'),
      allowNull: false,
      defaultValue: 'reportado',
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_accidentes',
    timestamps: true,
  }
);

// Investigacion de un accidente
export class InvestigacionAccidente extends Model {
  public id!: number;
  public accidenteId!: number;
  public causasInmediatas!: string;
  public causasBasicas!: string;
  public accionesCorrectivas!: string;
  public responsableInvestigacion!: number;
  public fechaInvestigacion!: string;
  public conclusiones!: string;
}

InvestigacionAccidente.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accidenteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_accidentes',
        key: 'id',
      },
    },
    causasInmediatas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    causasBasicas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accionesCorrectivas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    responsableInvestigacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    fechaInvestigacion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    conclusiones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_investigaciones',
    timestamps: true,
  }
);

// Evidencias adjuntas a un accidente
export class EvidenciaAccidente extends Model {
  public id!: number;
  public accidenteId!: number;
  public tipo!: 'foto' | 'documento_medico' | 'formato_reporte' | 'otro';
  public nombreArchivo!: string;
  public rutaArchivo!: string;
  public descripcion!: string | null;
}

EvidenciaAccidente.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accidenteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_accidentes',
        key: 'id',
      },
    },
    tipo: {
      type: DataTypes.ENUM('foto', 'documento_medico', 'formato_reporte', 'otro'),
      allowNull: false,
      defaultValue: 'otro',
    },
    nombreArchivo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_evidencias',
    timestamps: true,
  }
);

// Seguimiento de acciones correctivas
export class SeguimientoAccion extends Model {
  public id!: number;
  public accidenteId!: number;
  public descripcion!: string;
  public responsableId!: number;
  public fechaLimite!: string;
  public estado!: 'pendiente' | 'en_progreso' | 'completado';
  public observaciones!: string | null;
}

SeguimientoAccion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accidenteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_accidentes',
        key: 'id',
      },
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responsableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    fechaLimite: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_progreso', 'completado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_seguimientos',
    timestamps: true,
  }
);

// ========================================
// RELACIONES
// ========================================

// Accidente -> Investigacion (1:1)
AccidenteIncidente.hasOne(InvestigacionAccidente, {
  foreignKey: 'accidenteId',
  as: 'investigacion',
});
InvestigacionAccidente.belongsTo(AccidenteIncidente, {
  foreignKey: 'accidenteId',
  as: 'accidente',
});

// Accidente -> Evidencias (1:N)
AccidenteIncidente.hasMany(EvidenciaAccidente, {
  foreignKey: 'accidenteId',
  as: 'evidencias',
});
EvidenciaAccidente.belongsTo(AccidenteIncidente, {
  foreignKey: 'accidenteId',
  as: 'accidente',
});

// Accidente -> Seguimientos (1:N)
AccidenteIncidente.hasMany(SeguimientoAccion, {
  foreignKey: 'accidenteId',
  as: 'seguimientos',
});
SeguimientoAccion.belongsTo(AccidenteIncidente, {
  foreignKey: 'accidenteId',
  as: 'accidente',
});

// User relations
AccidenteIncidente.belongsTo(User, {
  foreignKey: 'reportadoPor',
  as: 'reportante',
});

InvestigacionAccidente.belongsTo(User, {
  foreignKey: 'responsableInvestigacion',
  as: 'responsable',
});

SeguimientoAccion.belongsTo(User, {
  foreignKey: 'responsableId',
  as: 'responsable',
});
