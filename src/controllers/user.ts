import bcrypt from 'bcrypt';
import {
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';

import { Area } from '../models/area';
import { Role } from '../models/role';
import { User } from '../models/user';

// Registro de usuario con asignación de rol

/**
 * Registra un nuevo usuario.
 * 
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 * 
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/register
 * register(req, res);
 */

 export const register = async (req: Request, res: Response): Promise<any> => {
  const { name, lastName, password, email, Rid, Aid} = req.body;

  // Verificar si el usuario ya existe
  const userOne = await User.findOne({ where: { email: email } });
  if (userOne) {
    return res.status(400).json({
      msg: `El usuario ya existe con el email: ${email}`,
    });
  }

  // Verificar si el rol existe
  const role = await Role.findByPk(Rid);
  if (!role) {
    return res.status(400).json({
      msg: `El rol con ID ${Rid} no existe`,
    });
  }

  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Crear usuario con el rol asignado
    const newUser = await User.create({
      name,
      lastName,
      password: passwordHash,
      email,
      status: 1,
      Rid: Rid, // Asociar rol al usuario
      Aid: Aid
    });

    res.status(200).json({
      message: 'Usuario registrado con éxito',
      user: newUser,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: 'Problemas al registrar el usuario',
      message: err.message || err,
    });
  }
};

/**
 * Inicia sesión con validación de rol.
 * 
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 * 
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/login
 * login(req, res);
 */

// Login con validación de rol
 export const login = async (req: Request, res: Response): Promise<any> => {
  const { password, email } = req.body;

  // Buscar usuario por email
  const user: any = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'role' },{model:Area, as :'area'}], // Incluir rol en la consulta
  });

  if (!user) {
    return res.status(400).json({
      msg: `Usuario no existe con el correo ${email}`,
    });
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({
      msg: 'Contraseña incorrecta',
    });
  }

  // Crear token con datos del usuario y su rol
  const token = jwt.sign(
    {
      userId: user.Uid,
      email: user.email,
      role: user.role.Rname, // Agregar nombre del rol al token
      area: user.area.Aname,
      Aid: user.Aid
    },
    process.env.SECRET_KEY || 'ptrYxZyMticytOs8eqKW17niMy8RR1JS',
    {
      expiresIn: '30m',
    }
  );

  res.json({
    msg: 'Inicio de sesión exitoso',
    token,
    role: user.role.Rname,
    userId: user.Uid,
    area: user.area.Aname,
    Aid: user.Aid,
    correoLider: user.area.correoLider
  });
};

/**
 * Restablece la contraseña de un usuario.
 * 
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 * 
 * @example
 * // Ejemplo de uso:
 * // POST /api/users/reset-password
 * resetPassword(req, res);
 */

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = passwordHash;
    await user.save();

    res.status(200).json({ msg: 'Contraseña actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar la contraseña', error });
  }
};


/**
 * Obtiene todos los usuarios.
 * 
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 * 
 * @example
 * // Ejemplo de uso:
 * // GET /api/users
 * getAllUsers(req, res);
 */

// Obtener todos los usuarios
export const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: 'role' },{model:Area, as:'area'}], // Incluir rol en la consulta
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los usuarios', error });
  }
};

/**
 * Elimina un usuario por su ID.
 * 
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 * 
 * @example
 * // Ejemplo de uso:
 * // DELETE /api/users/:Uid
 * deleteUserById(req, res);
 */

// Borrar usuario por ID
export const deleteUserById = async (req: Request, res: Response): Promise<any> => {
  const { Uid } = req.params;

  try {
    const user = await User.findByPk(Uid);

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    await user.destroy();
    res.status(200).json({ msg: 'Usuario eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar el usuario', error });
  }
};
