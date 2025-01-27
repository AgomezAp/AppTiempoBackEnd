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
        Extra: {type: DataTypes.STRING, allowNull: false}
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
        unique_key: {type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
        Nid: {type: DataTypes.INTEGER, allowNull: false, references: {model: User, key: "Uid"} },
        Name: {type: DataTypes.STRING, allowNull: false},
        type: {type: DataTypes.STRING, allowNull: false},
        Fecha: {type: DataTypes.DATE, allowNull: false},
        HoraEntrada: {type: DataTypes.DATE, allowNull: true},           //revisar el allow
        HoraSalida: {type: DataTypes.DATE, allowNull: true},            //revisar el allow
        description: {type: DataTypes.STRING, allowNull: true},         //revisar el allow
        horas: {type: DataTypes.INTEGER, allowNull: true},          //revisar el allow
        aceptacion: {type: DataTypes.BOOLEAN, allowNull: true}          //revisar el allow
    },
    {
        timestamps: false,
        paranoid: false,
    }
)
User.hasMany(Novedad, {foreignKey: "Nid", as: "novedades" });
Novedad.belongsTo(User,{foreignKey: "Nid", as: "usuario" });






