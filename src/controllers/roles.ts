import { Request, Response } from 'express';
import { Role } from '../models/role';
import { RoleModulo, MODULOS_SISTEMA } from '../models/roleModulo';
import { validateAdmin } from './archivo';

// Inicializa módulos para un rol recién creado (todos deshabilitados por defecto)
async function inicializarModulos(Rid: number) {
  const rows = MODULOS_SISTEMA.map(m => ({ Rid, modulo: m.key, habilitado: false }));
  await RoleModulo.bulkCreate(rows, { ignoreDuplicates: true });
}

// GET /api/roles — lista todos los roles con sus módulos habilitados
export const listarRoles = async (req: Request, res: Response): Promise<any> => {
  try {
    const roles = await Role.findAll({
      include: [{ model: RoleModulo, as: 'modulos', where: { habilitado: true }, required: false }],
      order: [['Rid', 'ASC']],
    });
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ msg: 'Error al obtener roles' });
  }
};

// GET /api/roles/:id/modulos — detalle de permisos de módulos de un rol
export const getModulosRol = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const role = await Role.findByPk(id as string);
    if (!role) return res.status(404).json({ msg: 'Rol no encontrado' });

    // Asegura que existan filas para todos los módulos del sistema
    await inicializarModulos(Number(id));

    const modulos = await RoleModulo.findAll({ where: { Rid: id }, order: [['modulo', 'ASC']] });
    return res.json({ role, modulos });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al obtener módulos del rol' });
  }
};

// PUT /api/roles/:id/modulos — actualiza los módulos habilitados para un rol
// Body: { modulos: ['horas', 'novedades', ...] }  (array de claves habilitadas)
export const actualizarModulosRol = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { modulos }: { modulos: string[] } = req.body;
  try {
    const role = await Role.findByPk(id as string);
    if (!role) return res.status(404).json({ msg: 'Rol no encontrado' });

    // Asegura filas base
    await inicializarModulos(Number(id));

    // Actualiza habilitado según la lista recibida
    await Promise.all(
      MODULOS_SISTEMA.map(m =>
        RoleModulo.update(
          { habilitado: modulos.includes(m.key) },
          { where: { Rid: id, modulo: m.key } }
        )
      )
    );
    return res.json({ msg: 'Permisos actualizados correctamente' });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al actualizar módulos' });
  }
};

// POST /api/roles — crea un nuevo rol
export const crearRolConModulos = async (req: Request, res: Response): Promise<any> => {
  const { Rname } = req.body;
  if (!Rname?.trim()) return res.status(400).json({ msg: 'El nombre del rol es requerido' });

  const existe = await Role.findOne({ where: { Rname: Rname.trim() } });
  if (existe) return res.status(400).json({ msg: `El rol "${Rname}" ya existe` });

  try {
    const nuevoRol = await Role.create({ Rname: Rname.trim() });
    await inicializarModulos((nuevoRol as any).Rid);
    return res.status(201).json({ msg: `Rol "${Rname}" creado`, role: nuevoRol });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al crear rol' });
  }
};

// PUT /api/roles/:id — actualiza el nombre de un rol
export const actualizarNombreRol = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { Rname } = req.body;
  if (!Rname?.trim()) return res.status(400).json({ msg: 'El nombre es requerido' });
  try {
    const role = await Role.findByPk(id as string);
    if (!role) return res.status(404).json({ msg: 'Rol no encontrado' });
    await Role.update({ Rname: Rname.trim() }, { where: { Rid: id } });
    return res.json({ msg: 'Rol actualizado' });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al actualizar rol' });
  }
};

// DELETE /api/roles/:id — elimina un rol y sus permisos
export const eliminarRol = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const ROLES_PROTEGIDOS = ['Admin', 'User', 'Tecnologia'];
  try {
    const role: any = await Role.findByPk(id as string);
    if (!role) return res.status(404).json({ msg: 'Rol no encontrado' });
    if (ROLES_PROTEGIDOS.includes(role.Rname)) {
      return res.status(400).json({ msg: `El rol "${role.Rname}" es de sistema y no puede eliminarse` });
    }
    await RoleModulo.destroy({ where: { Rid: id } });
    await Role.destroy({ where: { Rid: id } });
    return res.json({ msg: 'Rol eliminado' });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al eliminar rol' });
  }
};

// GET /api/roles/mis-modulos — devuelve los módulos habilitados para el rol del usuario autenticado
// Usado por el navbar para mostrar/ocultar secciones dinámicamente
export const getMisModulos = async (req: any, res: Response): Promise<any> => {
  try {
    const roleName: string = req.user?.role || '';
    const role = await Role.findOne({ where: { Rname: roleName } });
    if (!role) return res.json({ modulos: [] });

    const modulos = await RoleModulo.findAll({
      where: { Rid: (role as any).Rid, habilitado: true },
    });
    return res.json({ modulos: modulos.map((m: any) => m.modulo) });
  } catch (err) {
    return res.status(500).json({ msg: 'Error al obtener módulos del usuario' });
  }
};

// Middleware ligero que solo verifica JWT (no requiere Admin)
export const validateJWT = (req: any, res: Response, next: any): any => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ msg: 'Token no proporcionado' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token.slice(7), process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS');
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
};

export { validateAdmin };
