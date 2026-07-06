import { parseId } from '../utils/parseId'
import {
  Request,
  Response,
} from 'express';
import multer from 'multer';

import { Permiso } from '../models/permisos';
import { User } from '../models/user';
import { Area } from '../models/area';
import { sendMail } from '../utils/mailer';
import { appendPermisoToSheet } from '../utils/googleSheets';
import { DestinatarioPermiso } from '../models/destinatarioPermiso';
import { TipoPermiso } from '../models/tipoPermiso';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('soporte');

export const createPermiso = async (req: Request, res: Response): Promise<any> => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
    }

    const { emailPersonal, emailLider, nombre, numeroDocumento, fecha, fechaFin, tipo, horaEntrada, horaSalida, observaciones, diasLaborales, diasPagos: diasPagosRaw } = req.body;
    const soporte = req.file ? req.file.buffer : null;
    const Uid = parseInt(req.body.Uid, 10);
    const novedad = false;

    // Verificar si todos los campos obligatorios están presentes
    if (!emailPersonal || !emailLider || !nombre || !numeroDocumento || !fecha || !tipo || !Uid) {
      return res.status(400).json({ msg: 'Todos los campos obligatorios deben estar presentes' });
    }

    // Validar soporte obligatorio leyendo configuración desde DB (fallback a lista hardcodeada)
    let tipoConfig: TipoPermiso | null = null;
    try {
      tipoConfig = await TipoPermiso.findOne({ where: { nombre: tipo.trim(), activo: true } });
    } catch (_e) { /* tabla puede no existir aún en arranque inicial */ }

    const soporteObligatorio = tipoConfig
      ? tipoConfig.requiere_soporte
      : ['Vacaciones', 'Día de la familia'].some(t => t.toLowerCase() === tipo.trim().toLowerCase());

    if (soporteObligatorio && !soporte) {
      return res.status(400).json({ msg: 'El soporte es obligatorio para este tipo de permiso' });
    }

    // Verificar si el usuario existe
    const user = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: 'area' }],
    });
    if (!user) {
      return res.status(400).json({
        msg: `El usuario con ID ${Uid} no existe`,
      });
    }

    try {
      // Determinar si es un permiso de rango (varios días)
      const esPermisoRango = fechaFin && fechaFin !== fecha;

      // Validar días mínimos según configuración de DB (fallback a valores hardcodeados)
      if (esPermisoRango && tipoConfig && (tipoConfig.minimo_dias_general || tipoConfig.minimo_dias_gestion_admin)) {
        const diasSolicitados = parseInt(diasLaborales, 10) || 0;
        const areaNombre: string = (user as any).area?.Aname?.toLowerCase() || '';
        const esGestionAdministrativa = areaNombre.includes('gestión administrativa') || areaNombre.includes('gestion administrativa');
        const minimoRequerido = esGestionAdministrativa
          ? (tipoConfig.minimo_dias_gestion_admin ?? tipoConfig.minimo_dias_general ?? 0)
          : (tipoConfig.minimo_dias_general ?? 0);

        if (minimoRequerido > 0 && diasSolicitados < minimoRequerido) {
          return res.status(400).json({
            msg: `El mínimo de días laborales para este permiso ${esGestionAdministrativa ? 'en Gestión Administrativa' : ''} es ${minimoRequerido}`,
          });
        }
      } else if (tipo.trim().toLowerCase() === 'vacaciones' && esPermisoRango) {
        // Fallback si la tabla de tipos no existe aún
        const diasSolicitados = parseInt(diasLaborales, 10) || 0;
        const areaNombre: string = (user as any).area?.Aname?.toLowerCase() || '';
        const esGestionAdministrativa = areaNombre.includes('gestión administrativa') || areaNombre.includes('gestion administrativa');

        if (esGestionAdministrativa && diasSolicitados < 3) {
          return res.status(400).json({ msg: 'Para Gestión Administrativa, el mínimo de días laborales de vacaciones es 3' });
        }
        if (!esGestionAdministrativa && diasSolicitados < 6) {
          return res.status(400).json({ msg: 'El mínimo de días laborales de vacaciones es 6. Solo Gestión Administrativa puede solicitar menos días.' });
        }
      }
      const fechaInicioDate = new Date(fecha + 'T12:00:00');
      const fechaFinDate = esPermisoRango ? new Date(fechaFin + 'T12:00:00') : fechaInicioDate;

      // Validar días pagos para "Vacaciones más pagos"
      let diasPagos: number | null = null;
      if (tipo.trim().toLowerCase() === 'vacaciones más pagos') {
        diasPagos = parseInt(diasPagosRaw, 10);
        const diasSolicitados = parseInt(diasLaborales, 10) || 0;
        if (!diasPagos || diasPagos < 1) {
          return res.status(400).json({ msg: 'Debe indicar la cantidad de días pagos a disfrutar.' });
        }
        if (diasPagos > 9) {
          return res.status(400).json({ msg: 'Los días pagos a disfrutar no pueden superar 9 días.' });
        }
        if (diasSolicitados > 0 && diasPagos > diasSolicitados) {
          return res.status(400).json({ msg: `Los días pagos (${diasPagos}) no pueden superar los días de vacaciones solicitados (${diasSolicitados}).` });
        }
      }

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
        ...(diasPagos !== null ? { diasPagos } : {}),
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

      const tipoNormalizado = tipo.trim();

      // Construir asunto y cuerpo del correo
      const subject = 'Nuevo Permiso Solicitado';
      let text = `Se ha solicitado un nuevo permiso para ${nombre}.\n\n Tipo de permiso: ${tipo}.`;

      if (esPermisoRango) {
        text += `\n Fecha de inicio: ${fecha}.\n Fecha de fin: ${fechaFin}.`;
        if (diasLaborales) {
          text += `\n Días laborales: ${diasLaborales}.`;
        }
        if (diasPagos !== null) {
          text += `\n Días pagos a disfrutar: ${diasPagos}.`;
        }
      } else {
        text += `\n Fecha: ${fecha}.`;
      }

      if (horaSalida) text += `\n Hora de salida: ${horaSalida}.`;
      if (horaEntrada) text += `\n Hora de regreso: ${horaEntrada}.`;
      text += `\n\n Observaciones: ${observaciones}`;

      // Leer destinatarios desde DB; fallback a env vars si la tabla está vacía
      let fixedRecipients: string[] = [];
      let ccRecipients: string[] = [];

      try {
        const destinatariosDB = await DestinatarioPermiso.findAll({ where: { activo: true } });

        if (destinatariosDB.length > 0) {
          // Destinatarios fijos: siempre incluidos como destinatario principal
          const fijos = destinatariosDB.filter(d => d.tipo === 'fijo' && !d.es_cc);
          const fijosCC = destinatariosDB.filter(d => d.tipo === 'fijo' && d.es_cc);
          fixedRecipients = fijos.map(d => d.email);

          // Destinatarios filtrados: solo si el tipo de permiso está en su lista
          const filtrados = destinatariosDB.filter(d => d.tipo === 'filtrado');
          const ccFiltrados = filtrados.filter(d => {
            const tiposList: string[] = d.tipos_permiso || [];
            return tiposList.length === 0 || tiposList.some(t => t.toLowerCase() === tipoNormalizado.toLowerCase());
          });

          const mainSet = new Set([...fixedRecipients, ...fijosCC.map(d => d.email), emailLider, emailPersonal].map(e => e.toLowerCase()));
          ccRecipients = [
            ...fijosCC.map(d => d.email),
            ...ccFiltrados.map(d => d.email).filter(e => !mainSet.has(e.toLowerCase())),
          ];
        } else {
          // Fallback a variables de entorno
          fixedRecipients = process.env.FIXED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];
          const filteredEnv = process.env.FILTERED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];
          const tiposFiltradosFallback = ['Cita médica', 'Cita odontológica', 'Vacaciones', 'Incapacidad médica', 'Incapacidad laboral'];
          if (tiposFiltradosFallback.some(t => t.toLowerCase() === tipoNormalizado.toLowerCase())) {
            const mainSet = new Set([...fixedRecipients, emailLider, emailPersonal].map(e => e.toLowerCase()));
            ccRecipients = filteredEnv.filter(e => !mainSet.has(e.toLowerCase()));
          }
        }
      } catch (_dbErr) {
        // Si la tabla aún no existe, usar env vars
        fixedRecipients = process.env.FIXED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];
      }

      const mainRecipients = [...fixedRecipients, emailLider, emailPersonal];
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
