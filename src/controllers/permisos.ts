import {
  Request,
  Response,
} from 'express';
import multer from 'multer';

import { Permiso } from '../models/permisos';
import { User } from '../models/user';
import { sendMail } from '../utils/mailer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('soporte');

export const createPermiso = async (req: Request, res: Response): Promise<any> => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
    }

    const { emailPersonal, emailLider, nombre, numeroDocumento, fecha, tipo, horaEntrada, horaSalida, observaciones } = req.body;
    const soporte = req.file ? req.file.buffer : null;
    const Uid = parseInt(req.body.Uid, 10);
    const novedad = false;

    // Verificar si todos los campos obligatorios están presentes
    if (!emailPersonal || !emailLider || !nombre || !numeroDocumento || !fecha || !tipo || !Uid) {
      return res.status(400).json({ msg: 'Todos los campos obligatorios deben estar presentes' });
    }

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
        emailPersonal,
        emailLider,
        nombre,
        numeroDocumento,
        fecha,
        tipo,
        horaSalida,
        horaEntrada,
        observaciones,
        soporte,
        novedad,
        Uid,
      });
      //Envía correo electrónico al lider 
      const subject = 'Nuevo Permiso Solicitado';
      const text = `Se ha solicitado un nuevo permiso para ${nombre}. Tipo de permiso: ${tipo}. Fecha de salida: ${fecha}. Hora de salida: ${horaSalida}. Hora de regreso: ${horaEntrada}. Observaciones: ${observaciones}`;
      const fixedRecipients = process.env.FIXED_RECIPIENTS?.split(',') || [];
      await sendMail([...fixedRecipients, emailLider], subject, text);

      res.status(200).json({
        message: 'Permiso creado con éxito',
        permiso: newPermiso,
      });
      
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        msg: 'Error al crear el permiso triste',
        error: err,
      });
    }
  });
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
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener los usuarios con permisos', error });
  }
};