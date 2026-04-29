import { DataTypes, Model } from 'sequelize';
import sequelizeInventario from '../../database/connection-inventario';

// ============================================================
// MODELO: Analista
// Tabla: analistas en inventario_general
// Catálogo de personas del módulo inventario (independiente de users)
// ============================================================
export class Analista extends Model {
    public Aid!: number;
    public nombre!: string;
    public apellido!: string;
    public cedula!: string;
    public telefono?: string;
    public correo?: string;
    public cargo!: string;
    public activo!: boolean;
}

Analista.init(
    {
        Aid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING, allowNull: false },
        apellido: { type: DataTypes.STRING, allowNull: false },
        cedula: { type: DataTypes.STRING, unique: true, allowNull: false },
        telefono: { type: DataTypes.STRING },
        correo: { type: DataTypes.STRING },
        cargo: { type: DataTypes.STRING, defaultValue: 'Analista' },
        activo: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
        sequelize: sequelizeInventario,
        tableName: 'analistas',
        timestamps: false
    }
);
