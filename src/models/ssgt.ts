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
// MODELOS INSPECCIONES (SafetyCulture)
// ========================================

// Plantilla de Inspección (template reutilizable)
export class PlantillaInspeccion extends Model {
  public id!: number;
  public titulo!: string;
  public descripcion!: string | null;
  public categoria!: string | null;
  public empresa!: string | null;
  public creadorId!: number;
  public puntajeMaximo!: number;
  public umbralAprobacion!: number;
  public estado!: 'activa' | 'inactiva';
  public createdAt!: Date;
  public updatedAt!: Date;
}

PlantillaInspeccion.init(
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
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    creadorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    puntajeMaximo: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    umbralAprobacion: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 80,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'activa',
    },
  },
  {
    sequelize,
    tableName: 'ssgt_plantillas_inspeccion',
    timestamps: true,
  }
);

// Sección de Plantilla
export class SeccionPlantilla extends Model {
  public id!: number;
  public plantillaId!: number;
  public titulo!: string;
  public descripcion!: string | null;
  public orden!: number;
  public peso!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

SeccionPlantilla.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    plantillaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_plantillas_inspeccion',
        key: 'id',
      },
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    peso: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_secciones_plantilla',
    timestamps: true,
  }
);

// Pregunta de Plantilla
export class PreguntaPlantilla extends Model {
  public id!: number;
  public seccionId!: number;
  public texto!: string;
  public tipo!: string;
  public opciones!: string | null;
  public requerida!: boolean;
  public peso!: number;
  public respuestaEsperada!: string | null;
  public orden!: number;
  public requiereAccionSiNoConforme!: boolean;
  public omitible!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

PreguntaPlantilla.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    seccionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_secciones_plantilla',
        key: 'id',
      },
    },
    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'si_no',
    },
    opciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requerida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    peso: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    respuestaEsperada: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    requiereAccionSiNoConforme: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    omitible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_preguntas_plantilla',
    timestamps: true,
  }
);

// Inspección (ahora vinculada a plantilla)
export class InspeccionSSGT extends Model {
  public id!: number;
  public plantillaId!: number | null;
  public titulo!: string;
  public tipo!: string;
  public fechaInspeccion!: string;
  public lugar!: string | null;
  public inspectorId!: number;
  public empresa!: string | null;
  public estado!: string;
  public observacionesGenerales!: string | null;
  public puntajeObtenido!: number | null;
  public puntajeMaximo!: number | null;
  public porcentaje!: number | null;
  public aprobada!: boolean | null;
  public tokenAcceso!: string | null;
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
    plantillaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ssgt_plantillas_inspeccion',
        key: 'id',
      },
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
    puntajeObtenido: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    puntajeMaximo: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    porcentaje: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    aprobada: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    tokenAcceso: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_inspecciones',
    timestamps: true,
  }
);

// Respuesta de Inspección (reemplaza ChecklistItemSSGT)
export class RespuestaInspeccion extends Model {
  public id!: number;
  public inspeccionId!: number;
  public preguntaId!: number;
  public seccionId!: number;
  public valor!: string | null;
  public valorArchivo!: string | null;
  public puntos!: number;
  public orden!: number;
  public observacion!: string | null;
  public omitida!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RespuestaInspeccion.init(
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
    preguntaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_preguntas_plantilla',
        key: 'id',
      },
    },
    seccionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_secciones_plantilla',
        key: 'id',
      },
    },
    valor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    valorArchivo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    puntos: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    omitida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_respuestas_inspeccion',
    timestamps: true,
  }
);

// Acción Correctiva
export class AccionCorrectivaInspeccion extends Model {
  public id!: number;
  public inspeccionId!: number;
  public respuestaId!: number | null;
  public preguntaTexto!: string | null;
  public descripcion!: string;
  public prioridad!: string;
  public responsableId!: number | null;
  public fechaLimite!: string | null;
  public estado!: string;
  public evidenciaArchivo!: string | null;
  public observaciones!: string | null;
  public fechaCompletada!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

AccionCorrectivaInspeccion.init(
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
    respuestaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ssgt_respuestas_inspeccion',
        key: 'id',
      },
    },
    preguntaTexto: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    prioridad: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'media',
    },
    responsableId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid',
      },
    },
    fechaLimite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    evidenciaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fechaCompletada: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ssgt_acciones_correctivas',
    timestamps: true,
  }
);

// Fotos de Respuesta de Inspección (múltiples por respuesta)
export class FotoRespuestaInspeccion extends Model {
  public id!: number;
  public respuestaId!: number;
  public inspeccionId!: number;
  public rutaArchivo!: string;
  public descripcion!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

FotoRespuestaInspeccion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    respuestaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_respuestas_inspeccion',
        key: 'id',
      },
    },
    inspeccionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ssgt_inspecciones',
        key: 'id',
      },
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
    tableName: 'ssgt_fotos_respuesta',
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
// RELACIONES INSPECCIONES (SafetyCulture)
// ========================================

// Plantilla -> Secciones -> Preguntas
PlantillaInspeccion.hasMany(SeccionPlantilla, { foreignKey: 'plantillaId', as: 'secciones' });
SeccionPlantilla.belongsTo(PlantillaInspeccion, { foreignKey: 'plantillaId', as: 'plantilla' });
SeccionPlantilla.hasMany(PreguntaPlantilla, { foreignKey: 'seccionId', as: 'preguntas' });
PreguntaPlantilla.belongsTo(SeccionPlantilla, { foreignKey: 'seccionId', as: 'seccion' });
PlantillaInspeccion.belongsTo(User, { foreignKey: 'creadorId', as: 'creador' });

// Inspección -> Plantilla
InspeccionSSGT.belongsTo(PlantillaInspeccion, { foreignKey: 'plantillaId', as: 'plantilla' });
PlantillaInspeccion.hasMany(InspeccionSSGT, { foreignKey: 'plantillaId', as: 'inspecciones' });

// Inspección -> Respuestas
InspeccionSSGT.hasMany(RespuestaInspeccion, { foreignKey: 'inspeccionId', as: 'respuestas' });
RespuestaInspeccion.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
RespuestaInspeccion.belongsTo(PreguntaPlantilla, { foreignKey: 'preguntaId', as: 'pregunta' });
RespuestaInspeccion.belongsTo(SeccionPlantilla, { foreignKey: 'seccionId', as: 'seccion' });

// Inspección -> Acciones Correctivas
InspeccionSSGT.hasMany(AccionCorrectivaInspeccion, { foreignKey: 'inspeccionId', as: 'acciones' });
AccionCorrectivaInspeccion.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
AccionCorrectivaInspeccion.belongsTo(RespuestaInspeccion, { foreignKey: 'respuestaId', as: 'respuesta' });
AccionCorrectivaInspeccion.belongsTo(User, { foreignKey: 'responsableId', as: 'responsable' });

// Respuesta -> Fotos (1:N)
RespuestaInspeccion.hasMany(FotoRespuestaInspeccion, { foreignKey: 'respuestaId', as: 'fotos' });
FotoRespuestaInspeccion.belongsTo(RespuestaInspeccion, { foreignKey: 'respuestaId', as: 'respuesta' });
FotoRespuestaInspeccion.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
InspeccionSSGT.hasMany(FotoRespuestaInspeccion, { foreignKey: 'inspeccionId', as: 'fotos' });

// Inspección -> Condiciones Inseguras (mantener)
InspeccionSSGT.hasMany(CondicionInsegura, { foreignKey: 'inspeccionId', as: 'condiciones' });
CondicionInsegura.belongsTo(InspeccionSSGT, { foreignKey: 'inspeccionId', as: 'inspeccion' });
InspeccionSSGT.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });
CondicionInsegura.belongsTo(User, { foreignKey: 'reportadoPor', as: 'reportante' });

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
