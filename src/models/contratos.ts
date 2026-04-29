import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ============================================================
// MODELO: Contrato
// Tabla: contratos en api_inventario
// ============================================================
interface ContratoAtributos {
    id: number;
    Uid: number;
    tipo_contrato: string;
    numero_contrato?: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
    salario: number;
    cargo: string;
    empresa: string;
    area?: string;
    jornada?: string;
    lugar_trabajo?: string;
    periodo_prueba_dias?: number;
    estado: string;
    observaciones?: string;
    documento_url?: string;
    created_at?: Date;
    updated_at?: Date;
}

interface ContratoCreacion extends Optional<ContratoAtributos, 'id'> {}

export class Contrato extends Model<ContratoAtributos, ContratoCreacion>
    implements ContratoAtributos {
    public id!: number;
    public Uid!: number;
    public tipo_contrato!: string;
    public numero_contrato?: string;
    public fecha_inicio!: Date;
    public fecha_fin?: Date;
    public salario!: number;
    public cargo!: string;
    public empresa!: string;
    public area?: string;
    public jornada?: string;
    public lugar_trabajo?: string;
    public periodo_prueba_dias?: number;
    public estado!: string;
    public observaciones?: string;
    public documento_url?: string;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

Contrato.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'Uid' }
        },
        tipo_contrato: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'termino-indefinido | termino-fijo | prestacion-servicios | aprendizaje | obra-labor'
        },
        numero_contrato: { type: DataTypes.STRING(50) },
        fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
        fecha_fin: { type: DataTypes.DATEONLY },
        salario: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        cargo: { type: DataTypes.STRING(200), allowNull: false },
        empresa: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: 'AP | AT | ME'
        },
        area: { type: DataTypes.STRING(200) },
        jornada: {
            type: DataTypes.STRING(50),
            comment: 'tiempo-completo | medio-tiempo | horas'
        },
        lugar_trabajo: { type: DataTypes.STRING(200) },
        periodo_prueba_dias: { type: DataTypes.INTEGER, defaultValue: 0 },
        estado: {
            type: DataTypes.STRING(20),
            defaultValue: 'activo',
            comment: 'activo | terminado | suspendido | renovado'
        },
        observaciones: { type: DataTypes.TEXT },
        documento_url: { type: DataTypes.STRING(500) }
    },
    {
        sequelize,
        tableName: 'contratos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

// ============================================================
// MODELO: ContratoModificacion
// Tabla: contratos_modificaciones en api_inventario
// ============================================================
interface ModificacionAtributos {
    id: number;
    contrato_id: number;
    tipo_modificacion: string;
    fecha_efectiva: Date;
    descripcion: string;
    nuevo_salario?: number;
    nuevo_cargo?: string;
    nueva_fecha_fin?: Date;
    documento_url?: string;
    created_at?: Date;
}

interface ModificacionCreacion extends Optional<ModificacionAtributos, 'id'> {}

export class ContratoModificacion extends Model<ModificacionAtributos, ModificacionCreacion>
    implements ModificacionAtributos {
    public id!: number;
    public contrato_id!: number;
    public tipo_modificacion!: string;
    public fecha_efectiva!: Date;
    public descripcion!: string;
    public nuevo_salario?: number;
    public nuevo_cargo?: string;
    public nueva_fecha_fin?: Date;
    public documento_url?: string;
    public readonly created_at!: Date;
}

ContratoModificacion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        contrato_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'contratos', key: 'id' }
        },
        tipo_modificacion: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'otroSi | suspension | reactivacion | terminacion | cambio_salario | cambio_cargo | prorroga'
        },
        fecha_efectiva: { type: DataTypes.DATEONLY, allowNull: false },
        descripcion: { type: DataTypes.TEXT, allowNull: false },
        nuevo_salario: { type: DataTypes.DECIMAL(15, 2) },
        nuevo_cargo: { type: DataTypes.STRING(200) },
        nueva_fecha_fin: { type: DataTypes.DATEONLY },
        documento_url: { type: DataTypes.STRING(500) }
    },
    {
        sequelize,
        tableName: 'contratos_modificaciones',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

// Asociaciones
Contrato.hasMany(ContratoModificacion, { foreignKey: 'contrato_id', as: 'modificaciones' });
ContratoModificacion.belongsTo(Contrato, { foreignKey: 'contrato_id', as: 'contrato' });
