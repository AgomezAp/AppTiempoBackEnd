import { DataTypes } from 'sequelize';

import sequelize from '../database/connection';

export const userHasRoles = sequelize.define("userRoles",{
    Uid: { type: DataTypes.INTEGER, primaryKey: true},
    Rid: { type: DataTypes.INTEGER, primaryKey: true}
});