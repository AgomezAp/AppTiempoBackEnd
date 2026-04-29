import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ============================================================
// MODELOS DE EVALUACIONES DE DESEMPEÑO
// Tablas en api_inventario:
// - periodos_evaluacion
// - categorias_evaluacion
// - criterios_evaluacion
// - evaluaciones_desempeno
// - calificaciones_detalle
// - evaluacion_objetivos
// ============================================================

// ---- PERIODO DE EVALUACIÓN ----
interface PeriodoAtributos {
    id: number;
    nombre: string;
    descripcion?: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    estado: string;
    empresa?: string;
    created_at?: Date;
    updated_at?: Date;
}

export class PeriodoEvaluacion extends Model<PeriodoAtributos, Optional<PeriodoAtributos, 'id'>>
    implements PeriodoAtributos {
    public id!: number;
    public nombre!: string;
    public descripcion?: string;
    public fecha_inicio!: Date;
    public fecha_fin!: Date;
    public estado!: string;
    public empresa?: string;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

PeriodoEvaluacion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(200), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
        fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
        estado: {
            type: DataTypes.STRING(20),
            defaultValue: 'configuracion',
            comment: 'configuracion | activo | cerrado'
        },
        empresa: {
            type: DataTypes.STRING(10),
            comment: 'AP | AT | ME | NULL = todas las empresas'
        }
    },
    {
        sequelize,
        tableName: 'periodos_evaluacion',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

// ---- CATEGORÍA DE EVALUACIÓN ----
interface CategoriaAtributos {
    id: number;
    nombre: string;
    descripcion?: string;
    peso_porcentaje: number;
    orden?: number;
    activo?: boolean;
}

export class CategoriaEvaluacion extends Model<CategoriaAtributos, Optional<CategoriaAtributos, 'id'>>
    implements CategoriaAtributos {
    public id!: number;
    public nombre!: string;
    public descripcion?: string;
    public peso_porcentaje!: number;
    public orden?: number;
    public activo?: boolean;
}

CategoriaEvaluacion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(200), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        peso_porcentaje: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 100,
            comment: 'Porcentaje del total (las categorías activas deben sumar 100)'
        },
        orden: { type: DataTypes.INTEGER, defaultValue: 0 },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
        sequelize,
        tableName: 'categorias_evaluacion',
        timestamps: false
    }
);

// ---- CRITERIO DE EVALUACIÓN ----
interface CriterioAtributos {
    id: number;
    categoria_id: number;
    nombre: string;
    descripcion?: string;
    escala_min?: number;
    escala_max?: number;
    peso_porcentaje: number;
    orden?: number;
    activo?: boolean;
}

export class CriterioEvaluacion extends Model<CriterioAtributos, Optional<CriterioAtributos, 'id'>>
    implements CriterioAtributos {
    public id!: number;
    public categoria_id!: number;
    public nombre!: string;
    public descripcion?: string;
    public escala_min?: number;
    public escala_max?: number;
    public peso_porcentaje!: number;
    public orden?: number;
    public activo?: boolean;
}

CriterioEvaluacion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        categoria_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'categorias_evaluacion', key: 'id' }
        },
        nombre: { type: DataTypes.STRING(300), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        escala_min: { type: DataTypes.INTEGER, defaultValue: 1 },
        escala_max: { type: DataTypes.INTEGER, defaultValue: 5 },
        peso_porcentaje: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 100,
            comment: 'Peso dentro de la categoría'
        },
        orden: { type: DataTypes.INTEGER, defaultValue: 0 },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
        sequelize,
        tableName: 'criterios_evaluacion',
        timestamps: false
    }
);

// ---- EVALUACIÓN DE DESEMPEÑO ----
interface EvaluacionAtributos {
    id: number;
    periodo_id: number;
    evaluado_uid: number;
    evaluador_uid: number;
    estado: string;
    calificacion_final?: number;
    fortalezas?: string;
    areas_mejora?: string;
    compromisos?: string;
    plan_mejora?: string;
    comentarios_evaluador?: string;
    comentarios_evaluado?: string;
    firma_evaluador?: string;
    firma_evaluado?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    created_at?: Date;
    updated_at?: Date;
}

export class EvaluacionDesempeno extends Model<EvaluacionAtributos, Optional<EvaluacionAtributos, 'id'>>
    implements EvaluacionAtributos {
    public id!: number;
    public periodo_id!: number;
    public evaluado_uid!: number;
    public evaluador_uid!: number;
    public estado!: string;
    public calificacion_final?: number;
    public fortalezas?: string;
    public areas_mejora?: string;
    public compromisos?: string;
    public plan_mejora?: string;
    public comentarios_evaluador?: string;
    public comentarios_evaluado?: string;
    public firma_evaluador?: string;
    public firma_evaluado?: string;
    public fecha_inicio?: Date;
    public fecha_fin?: Date;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

EvaluacionDesempeno.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        periodo_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'periodos_evaluacion', key: 'id' }
        },
        evaluado_uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        evaluador_uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        estado: {
            type: DataTypes.STRING(30),
            defaultValue: 'pendiente',
            comment: 'pendiente | en_proceso | completada | revisada | aprobada'
        },
        calificacion_final: { type: DataTypes.DECIMAL(5, 2) },
        fortalezas: { type: DataTypes.TEXT },
        areas_mejora: { type: DataTypes.TEXT },
        compromisos: { type: DataTypes.TEXT },
        plan_mejora: { type: DataTypes.TEXT },
        comentarios_evaluador: { type: DataTypes.TEXT },
        comentarios_evaluado: { type: DataTypes.TEXT },
        firma_evaluador: { type: DataTypes.TEXT, comment: 'Base64 de firma digital' },
        firma_evaluado: { type: DataTypes.TEXT, comment: 'Base64 de firma digital' },
        fecha_inicio: { type: DataTypes.DATE },
        fecha_fin: { type: DataTypes.DATE }
    },
    {
        sequelize,
        tableName: 'evaluaciones_desempeno',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['periodo_id', 'evaluado_uid'] }
        ]
    }
);

// ---- CALIFICACIONES DETALLE ----
interface CalificacionAtributos {
    id: number;
    evaluacion_id: number;
    criterio_id: number;
    calificacion: number;
    comentario?: string;
}

export class CalificacionDetalle extends Model<CalificacionAtributos, Optional<CalificacionAtributos, 'id'>>
    implements CalificacionAtributos {
    public id!: number;
    public evaluacion_id!: number;
    public criterio_id!: number;
    public calificacion!: number;
    public comentario?: string;
}

CalificacionDetalle.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        evaluacion_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'evaluaciones_desempeno', key: 'id' }
        },
        criterio_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'criterios_evaluacion', key: 'id' }
        },
        calificacion: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: false
        },
        comentario: { type: DataTypes.TEXT }
    },
    {
        sequelize,
        tableName: 'calificaciones_detalle',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['evaluacion_id', 'criterio_id'] }
        ]
    }
);

// ---- EVALUACIÓN OBJETIVOS ----
interface ObjetivoAtributos {
    id: number;
    evaluacion_id: number;
    descripcion: string;
    meta_esperada?: string;
    resultado_obtenido?: string;
    peso_porcentaje?: number;
    cumplimiento_pct?: number;
    calificacion?: number;
}

export class EvaluacionObjetivo extends Model<ObjetivoAtributos, Optional<ObjetivoAtributos, 'id'>>
    implements ObjetivoAtributos {
    public id!: number;
    public evaluacion_id!: number;
    public descripcion!: string;
    public meta_esperada?: string;
    public resultado_obtenido?: string;
    public peso_porcentaje?: number;
    public cumplimiento_pct?: number;
    public calificacion?: number;
}

EvaluacionObjetivo.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        evaluacion_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'evaluaciones_desempeno', key: 'id' }
        },
        descripcion: { type: DataTypes.TEXT, allowNull: false },
        meta_esperada: { type: DataTypes.TEXT },
        resultado_obtenido: { type: DataTypes.TEXT },
        peso_porcentaje: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100 },
        cumplimiento_pct: {
            type: DataTypes.DECIMAL(5, 2),
            comment: '0-100% de cumplimiento del objetivo'
        },
        calificacion: { type: DataTypes.DECIMAL(3, 1) }
    },
    {
        sequelize,
        tableName: 'evaluacion_objetivos',
        timestamps: false
    }
);

// ============================================================
// ASOCIACIONES
// ============================================================
CategoriaEvaluacion.hasMany(CriterioEvaluacion, { foreignKey: 'categoria_id', as: 'criterios' });
CriterioEvaluacion.belongsTo(CategoriaEvaluacion, { foreignKey: 'categoria_id', as: 'categoria' });

PeriodoEvaluacion.hasMany(EvaluacionDesempeno, { foreignKey: 'periodo_id', as: 'evaluaciones' });
EvaluacionDesempeno.belongsTo(PeriodoEvaluacion, { foreignKey: 'periodo_id', as: 'periodo' });

EvaluacionDesempeno.hasMany(CalificacionDetalle, { foreignKey: 'evaluacion_id', as: 'calificaciones' });
CalificacionDetalle.belongsTo(EvaluacionDesempeno, { foreignKey: 'evaluacion_id', as: 'evaluacion' });

CalificacionDetalle.belongsTo(CriterioEvaluacion, { foreignKey: 'criterio_id', as: 'criterio' });

EvaluacionDesempeno.hasMany(EvaluacionObjetivo, { foreignKey: 'evaluacion_id', as: 'objetivos' });
EvaluacionObjetivo.belongsTo(EvaluacionDesempeno, { foreignKey: 'evaluacion_id', as: 'evaluacion' });
