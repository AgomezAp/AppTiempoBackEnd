import { DataTypes, Model } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';

// ============================================================
// MODELO: TipoInventario
// Tabla: tipos_inventario en inventario_general
// ============================================================
export class TipoInventario extends Model {
    public id!: number;
    public nombre!: string;
    public codigo!: string;
    public descripcion?: string;
    public icono!: string;
    public color!: string;
    public activo!: boolean;
    public orden!: number;
}

TipoInventario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING, unique: true, allowNull: false },
        codigo: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            comment: 'tecnologia|mobiliario|aseo|papeleria|botiquin|desechables|dotacion'
        },
        descripcion: { type: DataTypes.TEXT },
        icono: { type: DataTypes.STRING, defaultValue: 'fa-box' },
        color: { type: DataTypes.STRING, defaultValue: '#6c757d' },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true },
        orden: { type: DataTypes.INTEGER, defaultValue: 0 }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'tipos_inventario',
        timestamps: true
    }
);

// ============================================================
// MODELO: Mobiliario
// ============================================================
export class Mobiliario extends Model {
    public id!: number;
    public nombre!: string;
    public categoria?: string;
    public descripcion?: string;
    public unidadMedida!: string;
    public stockActual!: number;
    public ubicacionAlmacen?: string;
    public proveedor?: string;
    public precioUnitario?: number;
    public foto?: string;
    public activo!: boolean;
    public observaciones?: string;
    public Uid?: number;
    public tipoRegistro!: string;
    public serial?: string;
}

Mobiliario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING, allowNull: false },
        categoria: { type: DataTypes.STRING },
        descripcion: { type: DataTypes.TEXT },
        unidadMedida: { type: DataTypes.STRING, defaultValue: 'unidad' },
        stockActual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        ubicacionAlmacen: { type: DataTypes.STRING },
        proveedor: { type: DataTypes.STRING },
        precioUnitario: { type: DataTypes.DECIMAL(12, 2) },
        foto: { type: DataTypes.STRING },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true },
        observaciones: { type: DataTypes.TEXT },
        Uid: { type: DataTypes.INTEGER },
        tipoRegistro: {
            type: DataTypes.ENUM('individual', 'stock'),
            defaultValue: 'stock'
        },
        serial: { type: DataTypes.STRING }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'mobiliario',
        timestamps: true
    }
);

// ============================================================
// MODELO: Consumible
// ============================================================
export class Consumible extends Model {
    public id!: number;
    public nombre!: string;
    public tipoInventarioId!: number;
    public categoria?: string;
    public descripcion?: string;
    public unidadMedida!: string;
    public stockActual!: number;
    public stockMinimo!: number;
    public stockMaximo?: number;
    public proveedor?: string;
    public precioUnitario?: number;
    public ubicacionAlmacen?: string;
    public codigoInterno?: string;
    public foto?: string;
    public activo!: boolean;
    public observaciones?: string;
    public Uid?: number;
}

Consumible.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING, allowNull: false },
        tipoInventarioId: {
            type: DataTypes.INTEGER,
            references: { model: 'tipos_inventario', key: 'id' }
        },
        categoria: { type: DataTypes.STRING },
        descripcion: { type: DataTypes.TEXT },
        unidadMedida: { type: DataTypes.STRING, defaultValue: 'unidad' },
        stockActual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        stockMinimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        stockMaximo: { type: DataTypes.INTEGER },
        proveedor: { type: DataTypes.STRING },
        precioUnitario: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
        ubicacionAlmacen: { type: DataTypes.STRING },
        codigoInterno: { type: DataTypes.STRING, unique: true },
        foto: { type: DataTypes.TEXT },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true },
        observaciones: { type: DataTypes.TEXT },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'consumibles',
        timestamps: true
    }
);

// ============================================================
// MODELO: ActaConsumible
// ============================================================
export class ActaConsumible extends Model {
    public id!: number;
    public numeroActa!: string;
    public tipoInventarioId!: number;
    public nombreReceptor!: string;
    public cedulaReceptor?: string;
    public cargoReceptor!: string;
    public areaReceptor?: string;
    public correoReceptor?: string;
    public firmaReceptor?: string;
    public fechaEntrega?: Date;
    public fechaFirma?: Date;
    public estado!: string;
    public observaciones?: string;
    public motivoRechazo?: string;
    public Uid?: number;
}

ActaConsumible.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        numeroActa: { type: DataTypes.STRING, unique: true, allowNull: false },
        tipoInventarioId: {
            type: DataTypes.INTEGER,
            references: { model: 'tipos_inventario', key: 'id' }
        },
        nombreReceptor: { type: DataTypes.STRING, allowNull: false },
        cedulaReceptor: { type: DataTypes.STRING },
        cargoReceptor: { type: DataTypes.STRING, allowNull: false },
        areaReceptor: { type: DataTypes.STRING },
        correoReceptor: { type: DataTypes.STRING },
        firmaReceptor: { type: DataTypes.TEXT(undefined) },
        fechaEntrega: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        fechaFirma: { type: DataTypes.DATE },
        estado: {
            type: DataTypes.ENUM('pendiente_firma', 'firmada', 'rechazada', 'cancelada'),
            defaultValue: 'pendiente_firma'
        },
        observaciones: { type: DataTypes.TEXT },
        motivoRechazo: { type: DataTypes.TEXT },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'actas_consumibles',
        timestamps: true
    }
);

// ============================================================
// MODELO: ActaMobiliario
// ============================================================
export class ActaMobiliario extends Model {
    public id!: number;
    public numeroActa!: string;
    public nombreReceptor!: string;
    public cedulaReceptor?: string;
    public cargoReceptor!: string;
    public correoReceptor?: string;
    public firmaReceptor?: string;
    public fechaEntrega?: Date;
    public fechaFirma?: Date;
    public estado!: string;
    public observacionesEntrega?: string;
    public Uid?: number;
}

ActaMobiliario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        numeroActa: { type: DataTypes.STRING, unique: true, allowNull: false },
        nombreReceptor: { type: DataTypes.STRING, allowNull: false },
        cedulaReceptor: { type: DataTypes.STRING },
        cargoReceptor: { type: DataTypes.STRING, allowNull: false },
        telefonoReceptor: { type: DataTypes.STRING },
        correoReceptor: { type: DataTypes.STRING },
        firmaReceptor: { type: DataTypes.TEXT(undefined) },
        fechaEntrega: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        fechaFirma: { type: DataTypes.DATE },
        fechaDevolucionEsperada: { type: DataTypes.DATEONLY },
        fechaDevolucionReal: { type: DataTypes.DATE },
        estado: {
            type: DataTypes.ENUM(
                'pendiente_firma', 'activa', 'devuelta_parcial',
                'devuelta_completa', 'vencida', 'rechazada', 'cancelada'
            ),
            defaultValue: 'pendiente_firma'
        },
        observacionesEntrega: { type: DataTypes.TEXT },
        observacionesDevolucion: { type: DataTypes.TEXT },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'actas_mobiliario',
        timestamps: true
    }
);

// Asociaciones consumibles
Consumible.belongsTo(TipoInventario, { foreignKey: 'tipoInventarioId', as: 'tipoInventario' });
TipoInventario.hasMany(Consumible, { foreignKey: 'tipoInventarioId', as: 'consumibles' });
ActaConsumible.belongsTo(TipoInventario, { foreignKey: 'tipoInventarioId', as: 'tipoInventario' });

// ============================================================
// MODELO: DetalleActaConsumible
// ============================================================
export class DetalleActaConsumible extends Model {
    public id!: number;
    public actaConsumibleId!: number;
    public consumibleId!: number;
    public cantidad!: number;
    public unidadMedida!: string;
    public observaciones?: string;
    public consumible?: Consumible;
}

DetalleActaConsumible.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actaConsumibleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_consumibles', key: 'id' }
        },
        consumibleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'consumibles', key: 'id' }
        },
        cantidad: { type: DataTypes.INTEGER, allowNull: false },
        unidadMedida: { type: DataTypes.STRING, defaultValue: 'unidad' },
        observaciones: { type: DataTypes.TEXT }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'detalles_acta_consumibles',
        timestamps: true
    }
);

DetalleActaConsumible.belongsTo(ActaConsumible, { foreignKey: 'actaConsumibleId', as: 'acta' });
DetalleActaConsumible.belongsTo(Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
ActaConsumible.hasMany(DetalleActaConsumible, { foreignKey: 'actaConsumibleId', as: 'detalles' });

// ============================================================
// MODELO: TokenFirmaConsumible
// ============================================================
export class TokenFirmaConsumible extends Model {
    public id!: number;
    public actaConsumibleId!: number;
    public token!: string;
    public usado!: boolean;
    public fechaExpiracion!: Date;
    public acta?: ActaConsumible;
}

TokenFirmaConsumible.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actaConsumibleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_consumibles', key: 'id' }
        },
        token: { type: DataTypes.STRING(255), unique: true, allowNull: false },
        usado: { type: DataTypes.BOOLEAN, defaultValue: false },
        fechaExpiracion: { type: DataTypes.DATE, allowNull: false }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'tokens_firma_consumibles',
        timestamps: true
    }
);

TokenFirmaConsumible.belongsTo(ActaConsumible, { foreignKey: 'actaConsumibleId', as: 'acta' });
ActaConsumible.hasOne(TokenFirmaConsumible, { foreignKey: 'actaConsumibleId', as: 'tokenFirma' });

// ============================================================
// MODELO: MovimientoConsumible
// ============================================================
export class MovimientoConsumible extends Model {
    public id!: number;
    public consumibleId!: number;
    public tipoMovimiento!: string;
    public cantidad!: number;
    public stockAnterior!: number;
    public stockNuevo!: number;
    public motivo!: string;
    public descripcion?: string;
    public actaEntregaId?: number;
    public numeroDocumento?: string;
    public fecha?: Date;
    public Uid?: number;
}

MovimientoConsumible.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        consumibleId: { type: DataTypes.INTEGER, allowNull: false },
        tipoMovimiento: {
            type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'devolucion'),
            allowNull: false
        },
        cantidad: { type: DataTypes.INTEGER, allowNull: false },
        stockAnterior: { type: DataTypes.INTEGER, allowNull: false },
        stockNuevo: { type: DataTypes.INTEGER, allowNull: false },
        motivo: { type: DataTypes.STRING, allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        actaEntregaId: { type: DataTypes.INTEGER },
        numeroDocumento: { type: DataTypes.STRING },
        fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'movimientos_consumibles',
        timestamps: true
    }
);

MovimientoConsumible.belongsTo(Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
Consumible.hasMany(MovimientoConsumible, { foreignKey: 'consumibleId', as: 'movimientos' });

// ============================================================
// MODELO: DetalleActaMobiliario
// ============================================================
export class DetalleActaMobiliario extends Model {
    public id!: number;
    public actaMobiliarioId!: number;
    public mobiliarioId!: number;
    public cantidad!: number;
    public condicionEntrega?: string;
    public fotosEntrega?: string;
    public observacionesEntrega?: string;
    public cantidadDevuelta!: number;
    public fechaUltimaDevolucion?: Date;
    public estadoDevolucion?: string;
    public condicionDevolucion?: string;
    public fotosDevolucion?: string;
    public observacionesDevolucion?: string;
}

DetalleActaMobiliario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actaMobiliarioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_mobiliario', key: 'id' }
        },
        mobiliarioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'mobiliario', key: 'id' }
        },
        cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        condicionEntrega: {
            type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
            defaultValue: 'bueno'
        },
        fotosEntrega: { type: DataTypes.TEXT(undefined) },
        observacionesEntrega: { type: DataTypes.TEXT },
        cantidadDevuelta: { type: DataTypes.INTEGER, defaultValue: 0 },
        fechaUltimaDevolucion: { type: DataTypes.DATE },
        estadoDevolucion: {
            type: DataTypes.ENUM('disponible', 'danado', 'perdido'),
            allowNull: true
        },
        condicionDevolucion: {
            type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
            allowNull: true
        },
        fotosDevolucion: { type: DataTypes.TEXT(undefined) },
        observacionesDevolucion: { type: DataTypes.TEXT }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'detalles_acta_mobiliario',
        timestamps: true
    }
);

ActaMobiliario.hasMany(DetalleActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'detalles' });
DetalleActaMobiliario.belongsTo(ActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'acta' });
DetalleActaMobiliario.belongsTo(Mobiliario, { foreignKey: 'mobiliarioId', as: 'mobiliario' });
Mobiliario.hasMany(DetalleActaMobiliario, { foreignKey: 'mobiliarioId', as: 'entregas' });

// ============================================================
// MODELO: TokenFirmaMobiliario
// ============================================================
export class TokenFirmaMobiliario extends Model {
    public id!: number;
    public token!: string;
    public actaMobiliarioId!: number;
    public correoReceptor!: string;
    public estado!: string;
    public motivoRechazo?: string;
    public fechaEnvio?: Date;
    public fechaFirma?: Date;
    public ipFirma?: string;
    public userAgent?: string;
    public acta?: ActaMobiliario;
}

TokenFirmaMobiliario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        token: { type: DataTypes.STRING(100), unique: true, allowNull: false },
        actaMobiliarioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_mobiliario', key: 'id' }
        },
        correoReceptor: { type: DataTypes.STRING, allowNull: false },
        estado: {
            type: DataTypes.ENUM('pendiente', 'firmado', 'rechazado', 'cancelado'),
            defaultValue: 'pendiente'
        },
        motivoRechazo: { type: DataTypes.TEXT },
        fechaEnvio: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        fechaFirma: { type: DataTypes.DATE },
        ipFirma: { type: DataTypes.STRING },
        userAgent: { type: DataTypes.STRING(500) }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'tokens_firma_mobiliario',
        timestamps: true
    }
);

TokenFirmaMobiliario.belongsTo(ActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'acta' });
ActaMobiliario.hasMany(TokenFirmaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'tokensFirma' });

// ============================================================
// MODELO: MovimientoMobiliario
// ============================================================
export class MovimientoMobiliario extends Model {
    public id!: number;
    public mobiliarioId!: number;
    public tipoMovimiento!: string;
    public cantidad!: number;
    public stockAnterior!: number;
    public stockNuevo!: number;
    public motivo!: string;
    public descripcion?: string;
    public numeroDocumento?: string;
    public actaEntregaId?: number;
    public fecha?: Date;
    public Uid?: number;
}

MovimientoMobiliario.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        mobiliarioId: { type: DataTypes.INTEGER, allowNull: false },
        tipoMovimiento: {
            type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'baja', 'reserva', 'devolucion', 'firma_entrega', 'cancelacion'),
            allowNull: false
        },
        cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        stockAnterior: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        stockNuevo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        motivo: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'otro' },
        descripcion: { type: DataTypes.TEXT },
        numeroDocumento: { type: DataTypes.STRING(100) },
        actaEntregaId: { type: DataTypes.INTEGER },
        fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'movimientos_mobiliario',
        timestamps: true
    }
);

MovimientoMobiliario.belongsTo(Mobiliario, { foreignKey: 'mobiliarioId', as: 'mobiliario' });
Mobiliario.hasMany(MovimientoMobiliario, { foreignKey: 'mobiliarioId', as: 'movimientos' });
