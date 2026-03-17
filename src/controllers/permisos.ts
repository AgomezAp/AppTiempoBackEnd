import { parseId } from '../utils/parseId'
import {
  Request,
  Response,
} from 'express';
import multer from 'multer';

import { Permiso } from '../models/permisos';
import { User } from '../models/user';
import { sendMail } from '../utils/mailer';
import { appendPermisoToSheet } from '../utils/googleSheets';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('soporte');

export const createPermiso = async (req: Request, res: Response): Promise<any> => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
    }

    const { emailPersonal, emailLider, nombre, numeroDocumento, fecha, fechaFin, tipo, horaEntrada, horaSalida, observaciones, diasLaborales } = req.body;
    const soporte = req.file ? req.file.buffer : null;
    const Uid = parseInt(req.body.Uid, 10);
    const novedad = false;

    // Verificar si todos los campos obligatorios están presentes
    if (!emailPersonal || !emailLider || !nombre || !numeroDocumento || !fecha || !tipo || !Uid) {
      return res.status(400).json({ msg: 'Todos los campos obligatorios deben estar presentes' });
    }

    // Validar soporte obligatorio para Vacaciones y Día de la familia
    const tiposConSoporteObligatorio = ['Vacaciones', 'Día de la familia'];
    if (tiposConSoporteObligatorio.some(t => t.toLowerCase() === tipo.trim().toLowerCase()) && !soporte) {
      return res.status(400).json({ msg: 'El soporte es obligatorio para este tipo de permiso (Vacaciones / Día de la familia)' });
    }

    // Verificar si el usuario existe
    const user = await User.findByPk(parseId(Uid));
    if (!user) {
      return res.status(400).json({
        msg: `El usuario con ID ${Uid} no existe`,
      });
    }

    try {
      // Determinar si es un permiso de rango (varios días)
      const esPermisoRango = fechaFin && fechaFin !== fecha;
      const fechaInicioDate = new Date(fecha + 'T12:00:00');
      const fechaFinDate = esPermisoRango ? new Date(fechaFin + 'T12:00:00') : fechaInicioDate;
      
      // Crear permiso asociado al usuario
      const newPermiso = await Permiso.create({
        emailPersonal,
        emailLider,
        nombre,
        numeroDocumento,
        fecha: fechaInicioDate,
        tipo,
        horaSalida,
        horaEntrada,
        observaciones,
        soporte,
        novedad,
        Uid,
      });

      // Agregar permiso a Google Sheets (hoja principal - TODOS los permisos)
      const permisoSheetData = {
        fecha,
        nombre,
        numeroDocumento,
        tipo: esPermisoRango ? `${tipo} (${diasLaborales || 'varios'} días)` : tipo,
        horaEntrada,
        horaSalida,
        observaciones: esPermisoRango ? `${observaciones}\n\nFecha fin: ${fechaFin}` : observaciones,
      };

      await appendPermisoToSheet(permisoSheetData);

      // Tipos específicos para correo filtrado
      const tiposFiltrados = [
        'Cita médica',
        'Cita odontológica',
        'Vacaciones',
        'Incapacidad médica',
        'Incapacidad laboral',
      ];

      const tipoNormalizado = tipo.trim();

      // Enviar correo electrónico al líder (solo UNA VEZ)
      const subject = 'Nuevo Permiso Solicitado';
      let text = `Se ha solicitado un nuevo permiso para ${nombre}.\n\n Tipo de permiso: ${tipo}.`;
      
      if (esPermisoRango) {
        text += `\n Fecha de inicio: ${fecha}.\n Fecha de fin: ${fechaFin}.`;
        if (diasLaborales) {
          text += `\n Días laborales: ${diasLaborales}.`;
        }
      } else {
        text += `\n Fecha: ${fecha}.`;
      }
      
      if (horaSalida) text += `\n Hora de salida: ${horaSalida}.`;
      if (horaEntrada) text += `\n Hora de regreso: ${horaEntrada}.`;
      text += `\n\n Observaciones: ${observaciones}`;
      
      const fixedRecipients = process.env.FIXED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];

      // Para tipos filtrados, agregar FILTERED_RECIPIENTS como CC en el mismo correo
      const filteredRecipients = process.env.FILTERED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];
      const mainRecipients = [...fixedRecipients, emailLider, emailPersonal];
      const mainSet = new Set(mainRecipients.map(e => e.trim().toLowerCase()));
      const filteredSinDuplicados = filteredRecipients.filter(e => !mainSet.has(e.toLowerCase()));

      let ccRecipients: string[] = [];
      if (filteredSinDuplicados.length > 0 && tiposFiltrados.some(t => t.toLowerCase() === tipoNormalizado.toLowerCase())) {
        ccRecipients = filteredSinDuplicados;
      }

      await sendMail(mainRecipients, subject, text, soporte, ccRecipients);

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
