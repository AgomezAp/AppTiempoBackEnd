import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

interface PlantillaCertificadoAttributes {
  id: number;
  codigo: string;
  nombre: string;
  titulo: string;
  descripcion?: string;
  cuerpo: string;
  variables_disponibles: string[];
  activo: boolean;
  orden: number;
}

interface PlantillaCertificadoCreationAttributes
  extends Optional<PlantillaCertificadoAttributes, 'id' | 'descripcion' | 'variables_disponibles' | 'activo' | 'orden'> {}

export class PlantillaCertificado
  extends Model<PlantillaCertificadoAttributes, PlantillaCertificadoCreationAttributes>
  implements PlantillaCertificadoAttributes
{
  declare id: number;
  declare codigo: string;
  declare nombre: string;
  declare titulo: string;
  declare descripcion?: string;
  declare cuerpo: string;
  declare variables_disponibles: string[];
  declare activo: boolean;
  declare orden: number;
}

PlantillaCertificado.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    cuerpo: { type: DataTypes.TEXT, allowNull: false },
    variables_disponibles: { type: DataTypes.JSONB, defaultValue: [] },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 99 },
  },
  { sequelize, tableName: 'plantillas_certificado', timestamps: true }
);

export const TODAS_VARIABLES = [
  'nombreCompleto', 'cedula', 'cargo', 'empresa', 'nit',
  'gerente', 'cedulaGerente', 'cargoGerente',
  'fechaIngreso', 'salario', 'salarioEnPalabras',
  'ciudad', 'fechaCertificado', 'tipoContrato', 'fechaSalida',
];

export const PLANTILLAS_CERTIFICADO_SEED = [
  {
    codigo: 'laboral',
    nombre: 'Certificado Laboral',
    titulo: 'CERTIFICADO LABORAL',
    descripcion: 'Certifica que el empleado labora actualmente en la empresa.',
    orden: 1,
    cuerpo: `Por medio de la presente, hacemos constar que el (la) señor (a) {{nombreCompleto}}, identificado (a) con CÉDULA DE CIUDADANÍA {{cedula}}, labora en nuestra empresa como {{cargo}} desde el {{fechaIngreso}}, con un contrato a término indefinido y devengando un salario mensual de {{salario}} ({{salarioEnPalabras}} pesos).

Para constancia, se firma a los {{fechaCertificado}}.`,
    variables_disponibles: ['nombreCompleto', 'cedula', 'cargo', 'empresa', 'nit', 'gerente', 'cedulaGerente', 'cargoGerente', 'fechaIngreso', 'salario', 'salarioEnPalabras', 'ciudad', 'fechaCertificado', 'tipoContrato'],
  },
  {
    codigo: 'cesantias',
    nombre: 'Autorización de Retiro de Cesantías',
    titulo: 'AUTORIZACIÓN DE RETIRO DE CESANTÍAS',
    descripcion: 'Autoriza al empleado a retirar sus cesantías del fondo correspondiente.',
    orden: 2,
    cuerpo: `Mediante el presente documento yo {{gerente}} identificado con cedula de ciudadanía número {{cedulaGerente}} y con domicilio en {{ciudad}}, actuando en calidad de empleador, con razón social {{empresa}} {{nit}} me permito informar que he AUTORIZADO el RETIRO de cesantías del trabajador (a) así:

EMPLEADO: {{nombreCompleto}}
CÉDULA DE CIUDADANÍA: {{cedula}}
CONCEPTO DE RETIRO: TERMINACIÓN DEL CONTRATO DE TRABAJO
VALOR AUTORIZADO: RETIRO TOTAL
CAUSA: RETIRO CON INJUSTA CAUSA

Lo anterior de conformidad con lo establecido en el decreto 1072 de 2024, artículos 2.2.1.3.15 a 2.2.1.3.19 y el Decreto 1562 de 2019.`,
    variables_disponibles: ['nombreCompleto', 'cedula', 'cargo', 'empresa', 'nit', 'gerente', 'cedulaGerente', 'cargoGerente', 'ciudad', 'fechaCertificado'],
  },
  {
    codigo: 'terminacion',
    nombre: 'Certificado de Terminación de Contrato',
    titulo: 'CERTIFICADO LABORAL',
    descripcion: 'Certifica que el empleado terminó su vínculo laboral con la empresa.',
    orden: 3,
    cuerpo: `Por medio de la presente, hacemos constar que el (la) señor (a) {{nombreCompleto}}, identificado (a) con CÉDULA DE CIUDADANÍA {{cedula}}, laboró en nuestra empresa como {{cargo}} desde el {{fechaIngreso}} hasta el {{fechaSalida}}, con un contrato a término indefinido, devengando un salario mensual de {{salario}} ({{salarioEnPalabras}} pesos), terminando la relación laboral por despido sin justa causa.

Para constancia, se firma a los {{fechaCertificado}}.`,
    variables_disponibles: ['nombreCompleto', 'cedula', 'cargo', 'empresa', 'nit', 'gerente', 'cedulaGerente', 'cargoGerente', 'fechaIngreso', 'fechaSalida', 'salario', 'salarioEnPalabras', 'ciudad', 'fechaCertificado', 'tipoContrato'],
  },
];
