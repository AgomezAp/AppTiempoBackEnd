import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { Role } from './role';

export const MODULOS_SISTEMA = [
  { key: 'horas',                    label: 'Horas y Registro',             grupo: 'Horarios' },
  { key: 'novedades',                label: 'Novedades',                    grupo: 'Horarios' },
  { key: 'permisos',                 label: 'Permisos',                     grupo: 'Horarios' },
  { key: 'usuarios',                 label: 'Usuarios',                     grupo: 'Administración' },
  { key: 'admin_roles',              label: 'Gestión de Roles',             grupo: 'Administración' },
  { key: 'recursos',                 label: 'Recursos (Certificados, etc.)' , grupo: 'Recursos' },
  { key: 'ssgt',                     label: 'SSGT',                         grupo: 'Seguridad' },
  { key: 'rrhh_contratos',           label: 'RRHH - Contratos',             grupo: 'RRHH' },
  { key: 'rrhh_hoja_vida',           label: 'RRHH - Hoja de Vida',          grupo: 'RRHH' },
  { key: 'rrhh_evaluaciones',        label: 'RRHH - Evaluaciones',          grupo: 'RRHH' },
  { key: 'inventario_dispositivos',  label: 'Inventario - Dispositivos',    grupo: 'Inventario' },
  { key: 'inventario_mobiliario',    label: 'Inventario - Mobiliario',      grupo: 'Inventario' },
  { key: 'inventario_aseo',          label: 'Inventario - Aseo',            grupo: 'Inventario' },
  { key: 'inventario_papeleria',     label: 'Inventario - Papelería',       grupo: 'Inventario' },
  { key: 'inventario_botiquin',      label: 'Inventario - Botiquín',        grupo: 'Inventario' },
  { key: 'inventario_desechables',   label: 'Inventario - Desechables',     grupo: 'Inventario' },
  { key: 'inventario_dotacion',      label: 'Inventario - Dotación',        grupo: 'Inventario' },
  { key: 'inventario_herramientas',  label: 'Inventario - Herramientas',    grupo: 'Inventario' },
];

export class RoleModulo extends Model {
  public id!: number;
  public Rid!: number;
  public modulo!: string;
  public habilitado!: boolean;
}

RoleModulo.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Rid: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'roles', key: 'Rid' } },
    modulo: { type: DataTypes.STRING, allowNull: false },
    habilitado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'role_modulos',
    timestamps: false,
    // Evita duplicar la fila de un módulo para el mismo rol (ver migración manual
    // en server.ts que crea este índice también en bases ya existentes).
    indexes: [{ unique: true, fields: ['Rid', 'modulo'], name: 'role_modulos_rid_modulo_key' }],
  }
);

Role.hasMany(RoleModulo, { foreignKey: 'Rid', as: 'modulos' });
RoleModulo.belongsTo(Role, { foreignKey: 'Rid', as: 'role' });
