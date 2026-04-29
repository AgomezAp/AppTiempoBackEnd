import { DataTypes, Model } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';

// ============================================================
// Tabla user_mapping en inventario_general
// Vincula inventario_general.users.Uid → api_inventario.users.Uid
// sin alterar las FK existentes en otras tablas de inventario
// ============================================================
export class UserMapping extends Model {
    public inventario_uid!: number;
    public horarios_uid!: number;
    public metodo_mapeo!: string;
    public readonly created_at!: Date;
}

UserMapping.init(
    {
        inventario_uid: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            comment: 'FK a inventario_general.users.Uid (autoincrement)'
        },
        horarios_uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            comment: 'FK a api_inventario.users.Uid (id biométrico del colaborador)'
        },
        metodo_mapeo: {
            type: DataTypes.STRING(30),
            defaultValue: 'correo',
            comment: 'correo | nombre | cedula | manual'
        }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'user_mapping',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

export default UserMapping;
