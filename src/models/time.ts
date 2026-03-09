import { DataTypes } from 'sequelize';

import sequelize from '../database/connection';
import { User } from './user';

export const Registro = sequelize.define(
    "Registro",
    {
        unique_key: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},    
        Hid: {type: DataTypes.INTEGER, allowNull: false, references: {model: User, key: "Uid"} },
        Name: {type: DataTypes.STRING, allowNull: false},
        Entrada: {type: DataTypes.DATE, allowNull: false},
        Salida: {type: DataTypes.DATE, allowNull: false},
        Fecha: {type: DataTypes.DATE, allowNull: false},
        Extra: {type: DataTypes.STRING, allowNull: false},
        Total: {type: DataTypes.STRING, allowNull: true}
    },
    {
        timestamps: false,
        paranoid: false,
    }
);


User.hasMany(Registro, {foreignKey: "Hid", as: "registros" });
Registro.belongsTo(User, {foreignKey: "Hid", as: "usuario" });

export const Sumatoria = sequelize.define(
    "Sumatoria",
    {
        Sid: {type: DataTypes.INTEGER, primaryKey: true ,references: {model:User, key: "Uid"} },
        Name: {type: DataTypes.STRING, allowNull: false},
        Acumulado: {type: DataTypes.STRING, allowNull: false}
    },
    {
        timestamps: false,
        paranoid: false,
    }
);

User.hasOne(Sumatoria, {foreignKey: "Sid", as: "sumatoria" });
Sumatoria.belongsTo(User, {foreignKey: "Sid", as: "usuario" });

export const Novedad = sequelize.define(
    "Novedad",
    {
        id: {type:DataTypes.INTEGER, primaryKey:true},
        Nid: {type: DataTypes.INTEGER, allowNull: false, references: {model: User, key: "Uid"} },
        Name: {type: DataTypes.STRING, allowNull: false},
        type: {type: DataTypes.STRING, allowNull: false},
        Fecha: {type: DataTypes.DATE, allowNull: false},
        HoraEntrada: {type: DataTypes.STRING, allowNull: true},           //revisar el allow
        HoraSalida: {type: DataTypes.STRING, allowNull: true},            //revisar el allow
        description: {type: DataTypes.TEXT, allowNull: true},         //revisar el allow
        horas: {type: DataTypes.STRING, allowNull: true},          //revisar el allow
        aceptacion: {type: DataTypes.BOOLEAN, allowNull: true}          //revisar el allow
    },
    {
        timestamps: false,
        paranoid: false,
    }
)
User.hasMany(Novedad, {foreignKey: "Nid", as: "novedades" });
Novedad.belongsTo(User,{foreignKey: "Nid", as: "usuario" });

export const NovedadHistorico = sequelize.define(
    "NovedadHistorico",
    {
        Cid: {type:DataTypes.INTEGER, primaryKey: true},
        Nid: {type: DataTypes.INTEGER, allowNull: true},
        Name: {type: DataTypes.STRING, allowNull: true},
        type: {type: DataTypes.STRING, allowNull: true},
        Fecha: {type: DataTypes.DATE, allowNull: true},
        HoraEntrada: {type: DataTypes.STRING, allowNull: true},           
        HoraSalida: {type: DataTypes.STRING, allowNull: true},            
        description: {type: DataTypes.TEXT, allowNull: true},         
        horas: {type: DataTypes.STRING, allowNull: true},          
        aceptacion: {type: DataTypes.BOOLEAN, allowNull: true}
    },
    {
        timestamps: false,
        paranoid: false,
    }
)


export const HistoricoHorasExtras = sequelize.define(
    "HistoricoHorasExtras",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Sid: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: "Uid" } },
        Name: { type: DataTypes.STRING, allowNull: false },
        Acumulado: { type: DataTypes.STRING, allowNull: false },
        fecha: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
        timestamps: true,
        paranoid: false,
        tableName: "historico_horas_extras",
    }
);

User.hasMany(HistoricoHorasExtras, { foreignKey: "Sid", as: "historicoExtras" });
HistoricoHorasExtras.belongsTo(User, { foreignKey: "Sid", as: "usuario" });





