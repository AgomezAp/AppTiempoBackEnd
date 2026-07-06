import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

export class TipoPermiso extends Model {
  public id!: number;
  public nombre!: string;
  public descripcion!: string | null;
  public requiere_horas!: boolean;
  public requiere_soporte!: boolean;
  public requiere_fecha_fin!: boolean;
  public minimo_dias_general!: number | null;
  public minimo_dias_gestion_admin!: number | null;
  public es_para_cc_filtrado!: boolean;
  public activo!: boolean;
  public orden!: number;
}

TipoPermiso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requiere_horas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requiere_soporte: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requiere_fecha_fin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    minimo_dias_general: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    minimo_dias_gestion_admin: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    es_para_cc_filtrado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'tipos_permiso',
    timestamps: false,
  }
);

// Datos iniciales: los 20 tipos hardcodeados actualmente en el frontend/backend
export const TIPOS_PERMISO_SEED = [
  { nombre: 'Permiso personal de todo el día', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 1 },
  { nombre: 'Salida Temprano', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 2 },
  { nombre: 'Permiso personal por horas', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 3 },
  { nombre: 'Entrada luego de la jornada', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 4 },
  { nombre: 'Llegada tarde por factores externos', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 5 },
  { nombre: 'Cita médica', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: true, orden: 6 },
  { nombre: 'Cita odontológica', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: true, orden: 7 },
  { nombre: 'Incapacidad médica', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: true, orden: 8 },
  { nombre: 'Día de la familia', requiere_horas: false, requiere_soporte: true, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 9 },
  { nombre: 'Calamidad', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 10 },
  { nombre: 'Suspensión por proceso disciplinario', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 11 },
  { nombre: 'Licencia de luto', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 12 },
  { nombre: 'Media jornada por votación', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 13 },
  { nombre: 'Jurado de votación', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 14 },
  { nombre: 'Incapacidad laboral', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: true, orden: 15 },
  { nombre: 'Urgencia médica', requiere_horas: false, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 16 },
  { nombre: 'Movimiento de horario', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 17 },
  { nombre: 'Vacaciones', requiere_horas: false, requiere_soporte: true, requiere_fecha_fin: true, minimo_dias_general: 6, minimo_dias_gestion_admin: 3, es_para_cc_filtrado: true, orden: 18 },
  { nombre: 'Horas extras (en casa, fuera de instalaciones y viajes)', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 19 },
  { nombre: 'Adecuación horario (Horarios Especiales)', requiere_horas: true, requiere_soporte: false, requiere_fecha_fin: false, es_para_cc_filtrado: false, orden: 20 },
  { nombre: 'Vacaciones más pagos', requiere_horas: false, requiere_soporte: true, requiere_fecha_fin: true, minimo_dias_general: 6, minimo_dias_gestion_admin: 3, es_para_cc_filtrado: true, orden: 21 },
];
