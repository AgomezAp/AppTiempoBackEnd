import {
  Request,
  Response,
} from 'express';

import { Permiso } from '../models/permisos';
import { User } from '../models/user';

export const createPermiso = async (req: Request, res: Response): Promise<any> => {
    const { tipo, descripcion, fechaInicio, fechaFin, horas, Uid } = req.body;

    // Verificar si el usuario existe
    const user = await User.findByPk(Uid);
    if (!user) {
      return res.status(400).json({
        msg: `El usuario con ID ${Uid} no existe`,
      });
    }
  
    try {
      // Crear permiso asociado al usuario
      const newPermiso = await Permiso.create({
        tipo,
        descripcion,
        fechaInicio,
        fechaFin,
        horas,
        Uid,
      });
  
      res.status(200).json({
        message: 'Permiso creado con éxito',
        permiso: newPermiso,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        msg: 'Error al crear el permiso',
        error: err,
      });
    }
  };

  export const getPermisosByUserId = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ msg: 'El parámetro id es requerido' });
    }
  
    try {
      const permisos = await Permiso.findAll({ where: { Uid: id } });
      res.status(200).json(permisos);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ msg: 'Error al obtener los permisos del usuario', error: errorMessage });
    }
  };
  
export const getAllUsersWithPermisos = async (req: Request, res: Response): Promise<any> => {
    try {
      const users = await User.findAll({ include: [{ model: Permiso, as: 'permisos' }] });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ msg: 'Error al obtener los usuarios con permisos', error });
    }
  };
  