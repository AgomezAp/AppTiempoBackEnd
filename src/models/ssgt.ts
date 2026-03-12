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

// ========================================
// MODELOS EPP - Elementos de Protección Personal
// ========================================

// Catálogo de EPP
export class CatalogoEPP extends Model {
  public id!: number;
  public nombre!: string;
  public descripcion!: string | null;
  public categoria!: string | null;
  public stockActual!: number;
  public stockMinimo!: number;
  public fechaVencimiento!: string | null;
  public proveedor!: string | null;
  public imagen!: string | null;
  public activo!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CatalogoEPP.init(
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
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stockActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stockMinimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    proveedor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imagen: {
      type: DataTypes.STRING(500),
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
    tableName: 'ssgt_epp_catalogo',
    timestamps: true,
  }
);

// Entrega de EPP
export class EntregaEPP extends Model {
  public id!: number;
  public fecha!: string;
  public observaciones!: string | null;
  public creadoPor!: number;
  public empresa!: string | null;
  public estado!: 'pendiente' | 'firmado' | 'completado';
  public createdAt!: Date;
  public updatedAt!: Date;
}

EntregaEPP.init(
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
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    creadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'firmado', 'completado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
  },
  {
    sequelize,
    tableName: 'ssgt_epp_entregas',
    timestamps: true,
  }
);

// Detalle de entrega (items EPP entregados)
export class DetalleEntregaEPP extends Model {
  public id!: number;
  public entregaId!: number;
  public eppId!: number;
  public cantidad!: number;
  public talla!: string | null;
}

DetalleEntregaEPP.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    entregaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_epp_entregas',
        key: 'id',
      },
    },
    eppId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_epp_catalogo',
        key: 'id',
      },
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    talla: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_epp_detalles',
    timestamps: true,
  }
);

// Firma dinámica de entrega EPP
export class FirmaEntregaEPP extends Model {
  public id!: number;
  public entregaId!: number;
  public tipo!: string;
  public usuarioId!: number | null;
  public nombreCompleto!: string;
  public email!: string;
  public firma!: string | null;
  public fechaFirma!: Date | null;
  public tokenFirma!: string;
  public firmado!: boolean;
  public esExterno!: boolean;
}

FirmaEntregaEPP.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    entregaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_epp_entregas',
        key: 'id',
      },
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'ssgt_epp_firmas',
    timestamps: true,
  }
);

// Alertas de EPP (stock bajo, vencimiento)
export class AlertaEPP extends Model {
  public id!: number;
  public eppId!: number;
  public tipo!: 'stock_bajo' | 'vencimiento_proximo';
  public mensaje!: string;
  public leida!: boolean;
  public createdAt!: Date;
}

AlertaEPP.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eppId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_epp_catalogo',
        key: 'id',
      },
    },
    tipo: {
      type: DataTypes.ENUM('stock_bajo', 'vencimiento_proximo'),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    leida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_epp_alertas',
    timestamps: true,
  }
);

// ========================================
// RELACIONES EPP
// ========================================

// Entrega -> Detalles (1:N)
EntregaEPP.hasMany(DetalleEntregaEPP, { foreignKey: 'entregaId', as: 'detalles' });
DetalleEntregaEPP.belongsTo(EntregaEPP, { foreignKey: 'entregaId', as: 'entrega' });

// Entrega -> Firmas (1:N)
EntregaEPP.hasMany(FirmaEntregaEPP, { foreignKey: 'entregaId', as: 'firmas' });
FirmaEntregaEPP.belongsTo(EntregaEPP, { foreignKey: 'entregaId', as: 'entrega' });

// Entrega -> Creador (User)
EntregaEPP.belongsTo(User, { foreignKey: 'creadoPor', as: 'creador' });

// Detalle -> EPP
DetalleEntregaEPP.belongsTo(CatalogoEPP, { foreignKey: 'eppId', as: 'epp' });

// Firma -> Usuario
FirmaEntregaEPP.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

// Catalogo -> Alertas
CatalogoEPP.hasMany(AlertaEPP, { foreignKey: 'eppId', as: 'alertas' });
AlertaEPP.belongsTo(CatalogoEPP, { foreignKey: 'eppId', as: 'epp' });

// ========================================
// MODELOS DOCUMENTOS FIRMA
// ========================================

export class DocumentoFirma extends Model {
  public id!: number;
  public titulo!: string;
  public descripcion!: string | null;
  public archivoOriginal!: string;
  public archivoPdf!: string;
  public tipoArchivo!: string;
  public totalPaginas!: number;
  public estado!: string;
  public creadoPor!: number;
  public empresa!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

DocumentoFirma.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    archivoOriginal: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    archivoPdf: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    tipoArchivo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalPaginas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'borrador',
    },
    creadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_documentos_firma',
    timestamps: true,
  }
);

export class CampoFirmaDocumento extends Model {
  public id!: number;
  public documentoId!: number;
  public paginaNumero!: number;
  public posX!: number;
  public posY!: number;
  public ancho!: number;
  public alto!: number;
  public etiqueta!: string;
  public nombreFirmante!: string;
  public emailFirmante!: string;
  public usuarioId!: number | null;
  public esExterno!: boolean;
  public tokenFirma!: string | null;
  public firma!: string | null;
  public firmado!: boolean;
  public fechaFirma!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CampoFirmaDocumento.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    documentoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_documentos_firma',
        key: 'id',
      },
    },
    paginaNumero: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    posX: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    posY: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    ancho: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    alto: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    etiqueta: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nombreFirmante: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailFirmante: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    esExterno: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    tokenFirma: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    firma: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    firmado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_documento_campos',
    timestamps: true,
  }
);

// ========================================
// MODELOS INSPECCIONES Y RIESGOS
// ========================================

export class InspeccionSSGT extends Model {
  public id!: number;
  public titulo!: string;
  public tipo!: string;
  public fechaInspeccion!: string;
  public lugar!: string | null;
  public inspectorId!: number;
  public empresa!: string | null;
  public estado!: string;
  public observacionesGenerales!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

InspeccionSSGT.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fechaInspeccion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    lugar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    inspectorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    observacionesGenerales: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_inspecciones',
    timestamps: true,
  }
);

export class ChecklistItemSSGT extends Model {
  public id!: number;
  public inspeccionId!: number;
  public pregunta!: string;
  public cumple!: boolean | null;
  public observacion!: string | null;
  public orden!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ChecklistItemSSGT.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inspeccionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_inspecciones',
        key: 'id',
      },
    },
    pregunta: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    cumple: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_checklist_items',
    timestamps: true,
  }
);

export class CondicionInsegura extends Model {
  public id!: number;
  public inspeccionId!: number | null;
  public descripcion!: string;
  public ubicacion!: string;
  public foto!: string | null;
  public severidad!: string;
  public estado!: string;
  public reportadoPor!: number;
  public fechaReporte!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CondicionInsegura.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inspeccionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ssgt_inspecciones',
        key: 'id',
      },
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ubicacion: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    foto: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    severidad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'abierta',
    },
    reportadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    fechaReporte: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_condiciones_inseguras',
    timestamps: true,
  }
);

export class MatrizRiesgo extends Model {
  public id!: number;
  public nombre!: string;
  public descripcion!: string | null;
  public proceso!: string;
  public peligro!: string;
  public probabilidad!: number;
  public consecuencia!: number;
  public nivelRiesgo!: string;
  public controlesExistentes!: string | null;
  public accionRecomendada!: string | null;
  public responsableId!: number;
  public empresa!: string | null;
  public archivoAdjunto!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

MatrizRiesgo.init(
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
    proceso: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    peligro: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    probabilidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    consecuencia: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nivelRiesgo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    controlesExistentes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accionRecomendada: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    responsableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    archivoAdjunto: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_matriz_riesgos',
    timestamps: true,
  }
);

export class PlanAccion extends Model {
  public id!: number;
  public origen!: string;
  public origenId!: number;
  public descripcion!: string;
  public responsableId!: number;
  public fechaInicio!: string | null;
  public fechaLimite!: string;
  public estado!: string;
  public observaciones!: string | null;
  public evidenciaArchivo!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

PlanAccion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    origen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    origenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fechaLimite: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evidenciaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_planes_accion',
    timestamps: true,
  }
);

// ========================================
// MODELOS CAPACITACIONES SST
// ========================================

export class CapacitacionSST extends Model {
  public id!: number;
  public titulo!: string;
  public descripcion!: string | null;
  public tema!: string;
  public instructorId!: number | null;
  public instructorExterno!: string | null;
  public fechaProgramada!: string;
  public horaInicio!: string | null;
  public horaFin!: string | null;
  public lugar!: string | null;
  public empresa!: string | null;
  public estado!: string;
  public asistenciaId!: number | null;
  public materialArchivo!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CapacitacionSST.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tema: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    instructorExterno: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaProgramada: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    horaInicio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    horaFin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lugar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'programada',
    },
    asistenciaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    materialArchivo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_capacitaciones',
    timestamps: true,
  }
);

export class EvaluacionCapacitacion extends Model {
  public id!: number;
  public capacitacionId!: number;
  public titulo!: string;
  public tiempoLimite!: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

EvaluacionCapacitacion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    capacitacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_capacitaciones',
        key: 'id',
      },
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tiempoLimite: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_evaluaciones',
    timestamps: true,
  }
);

export class PreguntaEvaluacion extends Model {
  public id!: number;
  public evaluacionId!: number;
  public pregunta!: string;
  public tipo!: string;
  public opciones!: string | null;
  public respuestaCorrecta!: string;
  public orden!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

PreguntaEvaluacion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    evaluacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_evaluaciones',
        key: 'id',
      },
    },
    pregunta: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    opciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    respuestaCorrecta: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_preguntas',
    timestamps: true,
  }
);

export class RespuestaEvaluacion extends Model {
  public id!: number;
  public evaluacionId!: number;
  public usuarioId!: number;
  public respuestas!: string;
  public calificacion!: number;
  public fechaRespuesta!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RespuestaEvaluacion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    evaluacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_evaluaciones',
        key: 'id',
      },
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    respuestas: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    calificacion: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    fechaRespuesta: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_respuestas',
    timestamps: true,
  }
);

// ========================================
// RELACIONES DOCUMENTOS FIRMA
// ========================================

DocumentoFirma.hasMany(CampoFirmaDocumento, { foreignKey: 'documentoId', as: 'campos' });
CampoFirmaDocumento.belongsTo(DocumentoFirma, { foreignKey: 'documentoId', as: 'documento' });
DocumentoFirma.belongsTo(User, { foreignKey: 'creadoPor', as: 'creador' });
CampoFirmaDocumento.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

// ========================================
// RELACIONES INSPECCIONES Y RIESGOS
// ========================================

InspeccionSSGT.hasMany(ChecklistItemSSGT, { foreignKey: 'inspeccionId', as: 'checklist' });
ChecklistItemSSGT.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
InspeccionSSGT.hasMany(CondicionInsegura, { foreignKey: 'inspeccionId', as: 'condiciones' });
CondicionInsegura.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
InspeccionSSGT.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });
CondicionInsegura.belongsTo(User, { foreignKey: 'reportadoPor', as: 'reportante' });
MatrizRiesgo.belongsTo(User, { foreignKey: 'responsableId', as: 'responsable' });
PlanAccion.belongsTo(User, { foreignKey: 'responsableId', as: 'responsablePlan' });

// ========================================
// RELACIONES CAPACITACIONES SST
// ========================================

CapacitacionSST.hasOne(EvaluacionCapacitacion, { foreignKey: 'capacitacionId', as: 'evaluacion' });
EvaluacionCapacitacion.belongsTo(CapacitacionSST, { foreignKey: 'capacitacionId', as: 'capacitacion' });
EvaluacionCapacitacion.hasMany(PreguntaEvaluacion, { foreignKey: 'evaluacionId', as: 'preguntas' });
PreguntaEvaluacion.belongsTo(EvaluacionCapacitacion, { foreignKey: 'evaluacionId', as: 'evaluacion' });
EvaluacionCapacitacion.hasMany(RespuestaEvaluacion, { foreignKey: 'evaluacionId', as: 'respuestas' });
RespuestaEvaluacion.belongsTo(EvaluacionCapacitacion, { foreignKey: 'evaluacionId', as: 'evaluacion' });
CapacitacionSST.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });
RespuestaEvaluacion.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });
