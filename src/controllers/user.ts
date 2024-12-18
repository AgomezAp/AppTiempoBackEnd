import bcrypt from 'bcrypt';
import {
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';

import { Role } from '../models/role';
import { User } from '../models/user';

// Registro de usuario con asignación de rol
 export const register = async (req: Request, res: Response): Promise<any> => {
  const { name, lastName, password, email, Rid } = req.body;

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

// Login con validación de rol
 export const login = async (req: Request, res: Response): Promise<any> => {
  const { password, email } = req.body;

  // Buscar usuario por email
  const user: any = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'role' }], // Incluir rol en la consulta
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
  });
};
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