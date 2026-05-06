import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection';
import { Area } from './area';
import { Role } from './role';

export class User extends Model {
  public Uid!: number;
  public name!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public status!: number;
  public Rid!: number;
  public Aid!: number;
  public salario!: number;
  public empresa!: 'AP' | 'AT' | 'ME';
  public documentoIdentificacion!: string;
  public fondoPension!: string;
  public fondoCesantias!: string;
  public cargo!: string;
  public tipoContrato!: 'termino-indefinido' | 'termino-fijo';
  public certificadosGenerados!: number;
  public fechaIngreso!: Date;
  public celular!: string | null;
  // Campos extendidos de hoja de vida (migración 001)
  public segundo_nombre!: string | null;
  public segundo_apellido!: string | null;
  public tipo_documento!: string | null;
  public genero!: string | null;
  public estado_civil!: string | null;
  public lugar_nacimiento!: string | null;
  public fecha_nacimiento!: Date | null;
  public direccion!: string | null;
  public ciudad!: string | null;
  public barrio!: string | null;
  public telefono_fijo!: string | null;
  public contacto_emergencia_nombre!: string | null;
  public contacto_emergencia_telefono!: string | null;
  public contacto_emergencia_parentesco!: string | null;
  // Salud y tallas
  public rh!: string | null;
  public talla_camisa!: string | null;
  public talla_pantalon!: string | null;
  public talla_zapatos!: string | null;
  // Seguridad social
  public eps!: string | null;
  public arl!: string | null;
  public caja_compensacion!: string | null;
  // Datos bancarios
  public banco!: string | null;
  public tipo_cuenta_bancaria!: string | null;
  public numero_cuenta_bancaria!: string | null;
  // Foto
  public foto_url!: string | null;
}

User.init(
  {
    Uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      // autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Rid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Aid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    salario: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    empresa: {  
      type: DataTypes.ENUM('AP', 'AT', 'ME'),
      allowNull: true,
      defaultValue: 'AP',
    },
    documentoIdentificacion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    fondoPension: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'PORVENIR',
    },
    fondoCesantias: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'PORVENIR',
    },
    cargo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    tipoContrato: {
      type: DataTypes.ENUM('termino-indefinido', 'termino-fijo'),
      allowNull: true,
      defaultValue: 'termino-indefinido',
    },
    certificadosGenerados: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    fechaIngreso: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Campos extendidos de hoja de vida (migración 001)
    segundo_nombre: { type: DataTypes.STRING(100), allowNull: true },
    segundo_apellido: { type: DataTypes.STRING(100), allowNull: true },
    tipo_documento: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'CC' },
    genero: { type: DataTypes.STRING(20), allowNull: true },
    estado_civil: { type: DataTypes.STRING(20), allowNull: true },
    lugar_nacimiento: { type: DataTypes.STRING(100), allowNull: true },
    fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
    direccion: { type: DataTypes.TEXT, allowNull: true },
    ciudad: { type: DataTypes.STRING(100), allowNull: true },
    barrio: { type: DataTypes.STRING(100), allowNull: true },
    telefono_fijo: { type: DataTypes.STRING(20), allowNull: true },
    contacto_emergencia_nombre: { type: DataTypes.STRING(200), allowNull: true },
    contacto_emergencia_telefono: { type: DataTypes.STRING(20), allowNull: true },
    contacto_emergencia_parentesco: { type: DataTypes.STRING(50), allowNull: true },
    // Salud y tallas
    rh: { type: DataTypes.STRING(5), allowNull: true },
    talla_camisa: { type: DataTypes.STRING(10), allowNull: true },
    talla_pantalon: { type: DataTypes.STRING(10), allowNull: true },
    talla_zapatos: { type: DataTypes.STRING(10), allowNull: true },
    // Seguridad social
    eps: { type: DataTypes.STRING(100), allowNull: true },
    arl: { type: DataTypes.STRING(100), allowNull: true },
    caja_compensacion: { type: DataTypes.STRING(100), allowNull: true },
    // Datos bancarios
    banco: { type: DataTypes.STRING(100), allowNull: true },
    tipo_cuenta_bancaria: { type: DataTypes.STRING(20), allowNull: true },
    numero_cuenta_bancaria: { type: DataTypes.STRING(50), allowNull: true },
    // Foto
    foto_url: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  }
);

User.belongsTo(Role, { foreignKey: "Rid", as: "role" });
Role.hasMany(User, { foreignKey: "Rid", as: "users" });

User.belongsTo(Area, {foreignKey: 'Aid',as: 'area'});
Area.hasMany(User, {foreignKey: 'Aid',as: 'users'});