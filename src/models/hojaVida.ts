import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ============================================================
// MODELOS DE HOJA DE VIDA
// Tablas en api_inventario:
// - experiencia_laboral
// - formacion_academica
// - habilidades
// - referencias
// - grupo_familiar
// ============================================================

// ---- EXPERIENCIA LABORAL ----
interface ExperienciaAtributos {
    id: number;
    Uid: number;
    empresa: string;
    cargo: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
    descripcion?: string;
    telefono?: string;
    jefe_inmediato?: string;
    motivo_retiro?: string;
    activo?: boolean;
    created_at?: Date;
}

export class ExperienciaLaboral extends Model<ExperienciaAtributos, Optional<ExperienciaAtributos, 'id'>>
    implements ExperienciaAtributos {
    public id!: number;
    public Uid!: number;
    public empresa!: string;
    public cargo!: string;
    public fecha_inicio!: Date;
    public fecha_fin?: Date;
    public descripcion?: string;
    public telefono?: string;
    public jefe_inmediato?: string;
    public motivo_retiro?: string;
    public activo?: boolean;
    public readonly created_at!: Date;
}

ExperienciaLaboral.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        empresa: { type: DataTypes.STRING(200), allowNull: false },
        cargo: { type: DataTypes.STRING(200), allowNull: false },
        fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
        fecha_fin: { type: DataTypes.DATEONLY },
        descripcion: { type: DataTypes.TEXT },
        telefono: { type: DataTypes.STRING(20) },
        jefe_inmediato: { type: DataTypes.STRING(200) },
        motivo_retiro: { type: DataTypes.STRING(300) },
        activo: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'TRUE si es el empleo actual'
        }
    },
    {
        sequelize,
        tableName: 'experiencia_laboral',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- FORMACIÓN ACADÉMICA ----
interface FormacionAtributos {
    id: number;
    Uid: number;
    nivel: string;
    institucion: string;
    titulo?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    graduado?: boolean;
    numero_tarjeta?: string;
    created_at?: Date;
}

export class FormacionAcademica extends Model<FormacionAtributos, Optional<FormacionAtributos, 'id'>>
    implements FormacionAtributos {
    public id!: number;
    public Uid!: number;
    public nivel!: string;
    public institucion!: string;
    public titulo?: string;
    public fecha_inicio?: Date;
    public fecha_fin?: Date;
    public graduado?: boolean;
    public numero_tarjeta?: string;
    public readonly created_at!: Date;
}

FormacionAcademica.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        nivel: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'primaria | bachillerato | tecnico | tecnologo | universitario | especializacion | maestria | doctorado'
        },
        institucion: { type: DataTypes.STRING(200), allowNull: false },
        titulo: { type: DataTypes.STRING(300) },
        fecha_inicio: { type: DataTypes.DATEONLY },
        fecha_fin: { type: DataTypes.DATEONLY },
        graduado: { type: DataTypes.BOOLEAN, defaultValue: false },
        numero_tarjeta: { type: DataTypes.STRING(100) }
    },
    {
        sequelize,
        tableName: 'formacion_academica',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- HABILIDADES ----
interface HabilidadAtributos {
    id: number;
    Uid: number;
    habilidad: string;
    nivel?: string;
    tipo?: string;
    created_at?: Date;
}

export class Habilidad extends Model<HabilidadAtributos, Optional<HabilidadAtributos, 'id'>>
    implements HabilidadAtributos {
    public id!: number;
    public Uid!: number;
    public habilidad!: string;
    public nivel?: string;
    public tipo?: string;
    public readonly created_at!: Date;
}

Habilidad.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        habilidad: { type: DataTypes.STRING(200), allowNull: false },
        nivel: {
            type: DataTypes.STRING(20),
            comment: 'basico | intermedio | avanzado | experto'
        },
        tipo: {
            type: DataTypes.STRING(50),
            comment: 'tecnica | blanda | idioma | herramienta | software'
        }
    },
    {
        sequelize,
        tableName: 'habilidades',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- REFERENCIAS ----
interface ReferenciaAtributos {
    id: number;
    Uid: number;
    nombre: string;
    cargo?: string;
    empresa?: string;
    telefono: string;
    tipo?: string;
    created_at?: Date;
}

export class Referencia extends Model<ReferenciaAtributos, Optional<ReferenciaAtributos, 'id'>>
    implements ReferenciaAtributos {
    public id!: number;
    public Uid!: number;
    public nombre!: string;
    public cargo?: string;
    public empresa?: string;
    public telefono!: string;
    public tipo?: string;
    public readonly created_at!: Date;
}

Referencia.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        nombre: { type: DataTypes.STRING(200), allowNull: false },
        cargo: { type: DataTypes.STRING(200) },
        empresa: { type: DataTypes.STRING(200) },
        telefono: { type: DataTypes.STRING(20), allowNull: false },
        tipo: {
            type: DataTypes.STRING(20),
            comment: 'personal | laboral'
        }
    },
    {
        sequelize,
        tableName: 'referencias',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- GRUPO FAMILIAR ----
interface GrupoFamiliarAtributos {
    id: number;
    Uid: number;
    nombre: string;
    parentesco: string;
    fecha_nacimiento?: Date;
    documento?: string;
    ocupacion?: string;
    telefono?: string;
    dependiente?: boolean;
    created_at?: Date;
}

export class GrupoFamiliar extends Model<GrupoFamiliarAtributos, Optional<GrupoFamiliarAtributos, 'id'>>
    implements GrupoFamiliarAtributos {
    public id!: number;
    public Uid!: number;
    public nombre!: string;
    public parentesco!: string;
    public fecha_nacimiento?: Date;
    public documento?: string;
    public ocupacion?: string;
    public telefono?: string;
    public dependiente?: boolean;
    public readonly created_at!: Date;
}

GrupoFamiliar.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        nombre: { type: DataTypes.STRING(200), allowNull: false },
        parentesco: { type: DataTypes.STRING(50), allowNull: false },
        fecha_nacimiento: { type: DataTypes.DATEONLY },
        documento: { type: DataTypes.STRING(50) },
        ocupacion: { type: DataTypes.STRING(200) },
        telefono: { type: DataTypes.STRING(20) },
        dependiente: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'TRUE si es dependiente económico'
        }
    },
    {
        sequelize,
        tableName: 'grupo_familiar',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- DOCUMENTOS EXPEDIENTE ----
interface DocumentoExpedienteAtributos {
    id: number;
    Uid: number;
    nombre: string;
    descripcion?: string;
    ruta: string;
    tipo_archivo?: string;
    admin_nombre?: string;
    created_at?: Date;
}

export class DocumentoExpediente extends Model<DocumentoExpedienteAtributos, Optional<DocumentoExpedienteAtributos, 'id'>>
    implements DocumentoExpedienteAtributos {
    public id!: number;
    public Uid!: number;
    public nombre!: string;
    public descripcion?: string;
    public ruta!: string;
    public tipo_archivo?: string;
    public admin_nombre?: string;
    public readonly created_at!: Date;
}

DocumentoExpediente.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        nombre: { type: DataTypes.STRING(300), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        ruta: { type: DataTypes.STRING(500), allowNull: false },
        tipo_archivo: { type: DataTypes.STRING(50) },
        admin_nombre: { type: DataTypes.STRING(200) }
    },
    {
        sequelize,
        tableName: 'documentos_expediente',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- LLAMADOS DE ATENCIÓN ----
interface LlamadoAtencionAtributos {
    id: number;
    Uid: number;
    tipo: 'verbal' | 'escrito' | 'suspension' | 'otro';
    fecha: Date;
    descripcion: string;
    soporte_url?: string;
    admin_nombre?: string;
    reconocido?: boolean;
    estado?: 'activo' | 'archivado';
    created_at?: Date;
}

export class LlamadoAtencion extends Model<LlamadoAtencionAtributos, Optional<LlamadoAtencionAtributos, 'id'>>
    implements LlamadoAtencionAtributos {
    public id!: number;
    public Uid!: number;
    public tipo!: 'verbal' | 'escrito' | 'suspension' | 'otro';
    public fecha!: Date;
    public descripcion!: string;
    public soporte_url?: string;
    public admin_nombre?: string;
    public reconocido?: boolean;
    public estado?: 'activo' | 'archivado';
    public readonly created_at!: Date;
}

LlamadoAtencion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        tipo: {
            type: DataTypes.ENUM('verbal', 'escrito', 'suspension', 'otro'),
            allowNull: false,
            comment: 'verbal | escrito | suspension | otro'
        },
        fecha: { type: DataTypes.DATEONLY, allowNull: false },
        descripcion: { type: DataTypes.TEXT, allowNull: false },
        soporte_url: { type: DataTypes.STRING(500) },
        admin_nombre: { type: DataTypes.STRING(200) },
        reconocido: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'TRUE si el colaborador reconoció el llamado'
        },
        estado: {
            type: DataTypes.ENUM('activo', 'archivado'),
            defaultValue: 'activo'
        }
    },
    {
        sequelize,
        tableName: 'llamados_atencion',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// ---- NOTAS EXPEDIENTE ----
interface NotaExpedienteAtributos {
    id: number;
    Uid: number;
    nota: string;
    admin_nombre?: string;
    created_at?: Date;
}

export class NotaExpediente extends Model<NotaExpedienteAtributos, Optional<NotaExpedienteAtributos, 'id'>>
    implements NotaExpedienteAtributos {
    public id!: number;
    public Uid!: number;
    public nota!: string;
    public admin_nombre?: string;
    public readonly created_at!: Date;
}

NotaExpediente.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        nota: { type: DataTypes.TEXT, allowNull: false },
        admin_nombre: { type: DataTypes.STRING(200) }
    },
    {
        sequelize,
        tableName: 'notas_expediente',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);
