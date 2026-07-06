import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

export class ConfigEmpresa extends Model {
  public id!: number;
  public codigo!: 'AP' | 'AT' | 'ME';
  public nombre!: string;
  public nit!: string;
  public gerente!: string;
  public cargo_gerente!: string;
  public cedula_gerente!: string;
  public direccion!: string;
  public telefono!: string;
  public email!: string;
  public logo_url!: string;
  public watermark_url!: string;
  public header_color!: string;
  public accent_color!: string;
  public activo!: boolean;
}

ConfigEmpresa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.ENUM('AP', 'AT', 'ME'),
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    gerente: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cargo_gerente: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Representante Legal',
    },
    cedula_gerente: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    logo_url: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    watermark_url: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    header_color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#000000',
    },
    accent_color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#000000',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'config_empresas',
    timestamps: false,
  }
);

// Datos de seed: los mismos hardcodeados actualmente en certificado.ts
export const CONFIG_EMPRESAS_SEED = [
  {
    codigo: 'AP',
    nombre: 'ANDRES PUBLICIDAD TG SAS',
    nit: 'NIT 901.458.142-2',
    gerente: 'Carlos Andrés Tobón Agudelo',
    cargo_gerente: 'Representante Legal',
    cedula_gerente: '1088254149',
    direccion: 'Pereira, Risaralda - Colombia',
    telefono: '(+57) 300 392 1721',
    email: 'andrespublicidad@andrespublicidadtg.com',
    logo_url: 'Logo2.png',
    watermark_url: 'iso.png',
    header_color: '#000000',
    accent_color: '#1a5490',
    activo: true,
  },
  {
    codigo: 'AT',
    nombre: 'ANDRÉS TOBÓN',
    nit: '',
    gerente: 'Carlos Andrés Tobón Agudelo',
    cargo_gerente: 'Representante Legal',
    cedula_gerente: '1088254149',
    direccion: 'Pereira, Risaralda - Colombia',
    telefono: '(+57) 300 392 1721',
    email: 'andres.tobonag87@gmail.com',
    logo_url: 'Logo1.png',
    watermark_url: 'LogoAT.png',
    header_color: '#000000',
    accent_color: '#333333',
    activo: true,
  },
  {
    codigo: 'ME',
    nombre: 'MARIA EVANGELINA AGUDELO GIL',
    nit: 'CC. 42094435',
    gerente: 'María Evangelina Agudelo Gil',
    cargo_gerente: 'Representante Legal',
    cedula_gerente: '42094435',
    direccion: '',
    telefono: '(+57) 300 392 1721',
    email: 'maria.eva.agudelo@hotmail.com',
    logo_url: 'Logo3.png',
    watermark_url: 'FAVICON.png',
    header_color: '#C9A053',
    accent_color: '#C9A053',
    activo: true,
  },
];
