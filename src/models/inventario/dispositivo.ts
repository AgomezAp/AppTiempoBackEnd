import { DataTypes, Model, Optional } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';

// ============================================================
// MODELO: Dispositivo
// Tabla: dispositivos en inventario_general
// ============================================================
export class Dispositivo extends Model {
    public id!: number;
    public nombre!: string;
    public categoria!: string;
    public marca?: string;
    public modelo?: string;
    public serial?: string;
    public imei?: string;
    public color?: string;
    public descripcion?: string;
    public estado!: string;
    public condicion!: string;
    public ubicacion!: string;
    public fotos?: string;
    public fechaIngreso?: Date;
    public observaciones?: string;
    public Uid?: number;
    public tipoRegistro!: string;
    public stockActual!: number;
    public stockMinimo!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Dispositivo.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING, allowNull: false },
        categoria: { type: DataTypes.STRING },
        marca: { type: DataTypes.STRING },
        modelo: { type: DataTypes.STRING },
        serial: { type: DataTypes.STRING, unique: true },
        imei: { type: DataTypes.STRING },
        color: { type: DataTypes.STRING },
        descripcion: { type: DataTypes.TEXT },
        estado: {
            type: DataTypes.ENUM('disponible', 'reservado', 'entregado', 'danado', 'perdido', 'obsoleto'),
            defaultValue: 'disponible'
        },
        condicion: {
            type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
            defaultValue: 'bueno'
        },
        ubicacion: { type: DataTypes.STRING, defaultValue: 'Almacen Principal' },
        fotos: { type: DataTypes.TEXT(undefined) },
        fechaIngreso: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
        observaciones: { type: DataTypes.TEXT },
        Uid: {
            type: DataTypes.INTEGER,
            comment: 'FK a inventario_general.users.Uid (usar user_mapping para obtener horarios_uid)'
        },
        tipoRegistro: {
            type: DataTypes.ENUM('individual', 'stock'),
            defaultValue: 'individual'
        },
        stockActual: { type: DataTypes.INTEGER, defaultValue: 1 },
        stockMinimo: { type: DataTypes.INTEGER, defaultValue: 0 }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'dispositivos',
        timestamps: true
    }
);

// ============================================================
// MODELO: ActaEntrega (dispositivos)
// ============================================================
export class ActaEntrega extends Model {
    public id!: number;
    public numeroActa!: string;
    public nombreReceptor!: string;
    public cedulaReceptor?: string;
    public cargoReceptor!: string;
    public telefonoReceptor?: string;
    public correoReceptor?: string;
    public firmaReceptor?: string;
    public fechaEntrega?: Date;
    public fechaFirma?: Date;
    public fechaDevolucionEsperada?: Date;
    public fechaDevolucionReal?: Date;
    public estado!: string;
    public observacionesEntrega?: string;
    public observacionesDevolucion?: string;
    public Uid?: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ActaEntrega.init(
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
        tableName: 'actas_entrega',
        timestamps: true
    }
);

// ============================================================
// MODELO: DetalleActa
// ============================================================
export class DetalleActa extends Model {
    public id!: number;
    public actaId!: number;
    public dispositivoId!: number;
    public cantidad!: number;
    public estadoEntrega?: string;
    public condicionEntrega?: string;
    public fotosEntrega?: string;
    public observacionesEntrega?: string;
    public devuelto!: boolean;
    public fechaDevolucion?: Date;
    public estadoDevolucion?: string;
    public condicionDevolucion?: string;
    public fotosDevolucion?: string;
    public observacionesDevolucion?: string;
}

DetalleActa.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actaId: {
            type: DataTypes.INTEGER,
            references: { model: 'actas_entrega', key: 'id' }
        },
        dispositivoId: {
            type: DataTypes.INTEGER,
            references: { model: 'dispositivos', key: 'id' }
        },
        cantidad: { type: DataTypes.INTEGER, defaultValue: 1 },
        estadoEntrega: { type: DataTypes.STRING },
        condicionEntrega: {
            type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
            defaultValue: 'bueno'
        },
        fotosEntrega: { type: DataTypes.TEXT(undefined) },
        observacionesEntrega: { type: DataTypes.TEXT },
        devuelto: { type: DataTypes.BOOLEAN, defaultValue: false },
        fechaDevolucion: { type: DataTypes.DATE },
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
        tableName: 'detalles_acta',
        timestamps: true
    }
);

// ============================================================
// MODELO: TokenFirma (dispositivos)
// ============================================================
export class TokenFirma extends Model {
    public id!: number;
    public token!: string;
    public actaId!: number;
    public correoReceptor!: string;
    public estado!: string;
    public motivoRechazo?: string;
    public fechaEnvio?: Date;
    public fechaFirma?: Date;
    public ipFirma?: string;
    public userAgent?: string;
}

TokenFirma.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        token: { type: DataTypes.STRING(100), unique: true, allowNull: false },
        actaId: {
            type: DataTypes.INTEGER,
            references: { model: 'actas_entrega', key: 'id' }
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
        tableName: 'tokens_firma',
        timestamps: false
    }
);

// ============================================================
// MODELO: ActaDevolucion
// ============================================================
export class ActaDevolucion extends Model {
    public id!: number;
    public numeroActa!: string;
    public nombreReceptor?: string;
    public cedulaReceptor?: string;
    public cargoReceptor?: string;
    public correoReceptor?: string;
    public nombreEntrega?: string;
    public cedulaEntrega?: string;
    public cargoEntrega?: string;
    public correoEntrega?: string;
    public firmaEntrega?: string;
    public firmaReceptor?: string;
    public fechaDevolucion!: Date;
    public estado!: string;
    public observaciones?: string;
    public Uid?: number;
}

ActaDevolucion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        numeroActa: { type: DataTypes.STRING(50), unique: true, allowNull: false },
        nombreReceptor: { type: DataTypes.STRING },
        cedulaReceptor: { type: DataTypes.STRING(20) },
        cargoReceptor: { type: DataTypes.STRING },
        correoReceptor: { type: DataTypes.STRING },
        nombreEntrega: { type: DataTypes.STRING },
        cedulaEntrega: { type: DataTypes.STRING(20) },
        cargoEntrega: { type: DataTypes.STRING },
        correoEntrega: { type: DataTypes.STRING },
        firmaEntrega: { type: DataTypes.TEXT },
        firmaReceptor: { type: DataTypes.TEXT },
        fechaDevolucion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        estado: {
            type: DataTypes.ENUM('pendiente_firma', 'completada', 'rechazada'),
            defaultValue: 'pendiente_firma'
        },
        observaciones: { type: DataTypes.TEXT },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'actas_devolucion',
        timestamps: true
    }
);

// ============================================================
// MODELO: MovimientoDispositivo
// ============================================================
export class MovimientoDispositivo extends Model {
    public id!: number;
    public dispositivoId!: number;
    public tipoMovimiento!: string;
    public estadoAnterior?: string;
    public estadoNuevo?: string;
    public descripcion!: string;
    public actaId?: number;
    public fecha?: Date;
    public Uid?: number;
}

MovimientoDispositivo.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dispositivoId: {
            type: DataTypes.INTEGER,
            references: { model: 'dispositivos', key: 'id' }
        },
        tipoMovimiento: {
            type: DataTypes.ENUM(
                'ingreso', 'reserva', 'prestamo', 'devolucion', 'cambio_estado',
                'actualizacion', 'baja', 'firma_entrega', 'entrada_stock',
                'salida_stock', 'retirar_stock', 'conversion_stock', 'cancelacion'
            )
        },
        estadoAnterior: { type: DataTypes.STRING },
        estadoNuevo: { type: DataTypes.STRING },
        descripcion: { type: DataTypes.TEXT, allowNull: false },
        actaId: { type: DataTypes.INTEGER },
        fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        Uid: { type: DataTypes.INTEGER }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'movimientos_dispositivo',
        timestamps: false
    }
);

// ============================================================
// ASOCIACIONES
// ============================================================
ActaEntrega.hasMany(DetalleActa, { foreignKey: 'actaId', as: 'detalles' });
DetalleActa.belongsTo(ActaEntrega, { foreignKey: 'actaId' });

DetalleActa.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });
Dispositivo.hasMany(DetalleActa, { foreignKey: 'dispositivoId' });

ActaEntrega.hasMany(TokenFirma, { foreignKey: 'actaId', as: 'tokens' });
TokenFirma.belongsTo(ActaEntrega, { foreignKey: 'actaId' });

Dispositivo.hasMany(MovimientoDispositivo, { foreignKey: 'dispositivoId', as: 'movimientos' });

// ============================================================
// MODELO: DetalleDevolucion
// ============================================================
export class DetalleDevolucion extends Model {
    public id!: number;
    public actaDevolucionId!: number;
    public dispositivoId!: number;
    public estadoDevolucion!: string;
    public condicionDevolucion?: string;
    public fotosDevolucion?: string;
    public observaciones?: string;
}

DetalleDevolucion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actaDevolucionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_devolucion', key: 'id' }
        },
        dispositivoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'dispositivos', key: 'id' }
        },
        estadoDevolucion: {
            type: DataTypes.ENUM('disponible', 'danado', 'perdido'),
            defaultValue: 'disponible'
        },
        condicionDevolucion: { type: DataTypes.STRING },
        fotosDevolucion: { type: DataTypes.TEXT },
        observaciones: { type: DataTypes.TEXT }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'detalles_devolucion',
        timestamps: true
    }
);

// ============================================================
// MODELO: TokenDevolucion
// ============================================================
export class TokenDevolucion extends Model {
    public id!: number;
    public token!: string;
    public actaDevolucionId!: number;
    public correoDestinatario!: string;
    public estado!: string;
    public motivoRechazo?: string;
    public fechaEnvio?: Date;
    public fechaFirma?: Date;
    public ipFirma?: string;
    public userAgent?: string;
    public actaDevolucion?: ActaDevolucion;
}

TokenDevolucion.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        token: { type: DataTypes.STRING(100), unique: true, allowNull: false },
        actaDevolucionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'actas_devolucion', key: 'id' }
        },
        correoDestinatario: { type: DataTypes.STRING, allowNull: false },
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
        tableName: 'tokens_devolucion',
        timestamps: true
    }
);

ActaDevolucion.hasMany(DetalleDevolucion, { foreignKey: 'actaDevolucionId', as: 'detalles' });
DetalleDevolucion.belongsTo(ActaDevolucion, { foreignKey: 'actaDevolucionId', as: 'actaDevolucion' });
DetalleDevolucion.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });
Dispositivo.hasMany(DetalleDevolucion, { foreignKey: 'dispositivoId', as: 'detallesDevolucion' });

TokenDevolucion.belongsTo(ActaDevolucion, { foreignKey: 'actaDevolucionId', as: 'actaDevolucion' });
ActaDevolucion.hasMany(TokenDevolucion, { foreignKey: 'actaDevolucionId', as: 'tokensFirma' });
