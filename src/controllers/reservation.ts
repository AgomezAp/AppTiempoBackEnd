import { Request, Response } from 'express';
import { Reservation } from '../models/reservation';
import { Room } from '../models/room';
import { User } from '../models/user';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Op } from 'sequelize';
import { sendReservationEmail } from '../utils/mailer';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const TIMEZONE = 'America/Bogota';
const WORK_START = '07:30';
const WORK_END = '17:00';
const MIN_DURATION = 30; // minutos
const MAX_ADVANCE_DAYS = 7;

// Validar que la fecha sea válida y no esté en el pasado
const isValidReservationDate = (date: string): boolean => {
  try {
    let parsedDate;

    // Intentar parsear con diferentes formatos
    if (date.includes('/')) {
      // Formato DD/MM/YYYY
      const [day, month, year] = date.split('/');
      parsedDate = dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, 'YYYY-MM-DD');
    } else if (date.includes('-')) {
      // Formato YYYY-MM-DD
      parsedDate = dayjs(date, 'YYYY-MM-DD');
    } else {
      // Intentar parsear como está
      parsedDate = dayjs(date);
    }

    if (!parsedDate.isValid()) {
      console.error('Invalid date format:', date);
      return false;
    }

    // Convertir a timezone y comparar
    const reservationDate = parsedDate.tz(TIMEZONE);
    const today = dayjs().tz(TIMEZONE).startOf('day');
    const maxDate = today.add(MAX_ADVANCE_DAYS, 'days');

    return reservationDate.isSameOrAfter(today) && reservationDate.isSameOrBefore(maxDate);
  } catch (error) {
    console.error('Error validando fecha:', date, error);
    return false;
  }
};

// Validar que sea día laboral (lunes a sábado)
const isWorkDay = (date: string): boolean => {
  try {
    let dateObj;

    // Intentar parsear con diferentes formatos
    if (date.includes('/')) {
      // Formato DD/MM/YYYY
      const [day, month, year] = date.split('/');
      dateObj = dayjs(`${year}-${month}-${day}`, 'YYYY-MM-DD');
    } else if (date.includes('-')) {
      // Formato YYYY-MM-DD
      dateObj = dayjs(date, 'YYYY-MM-DD');
    } else {
      dateObj = dayjs(date);
    }

    if (!dateObj.isValid()) {
      console.error('Invalid date for workday check:', date);
      return false;
    }

    const day = dateObj.day();
    return day >= 1 && day <= 6; // 1 = Lunes, 6 = Sábado
  } catch (error) {
    console.error('Error validando día laboral:', date, error);
    return false;
  }
};

// Validar que la hora esté dentro del horario laboral
const isWithinWorkHours = (startTime: string, endTime: string): boolean => {
  return startTime >= WORK_START && endTime <= WORK_END;
};

// Validar duración mínima
const isValidDuration = (startTime: string, endTime: string): boolean => {
  const start = dayjs(`2000-01-01 ${startTime}`);
  const end = dayjs(`2000-01-01 ${endTime}`);
  const durationMinutes = end.diff(start, 'minute');
  return durationMinutes >= MIN_DURATION && end.isAfter(start);
};

// Obtener espacios disponibles en una sala para un día específico
export const getAvailableSlots = async (req: Request, res: Response): Promise<any> => {
  try {
    const { roomId, date } = req.query;

    console.log('Request para slots - roomId:', roomId, 'date:', date);

    if (!roomId || !date) {
      return res.status(400).json({
        success: false,
        message: 'roomId y date son requeridos',
      });
    }

    // Validar fecha
    if (!isValidReservationDate(date as string)) {
      console.error('Fecha inválida:', date);
      return res.status(400).json({
        success: false,
        message: 'La fecha no es válida. Debe estar dentro de los próximos 7 días',
      });
    }

    if (!isWorkDay(date as string)) {
      console.error('No es día laboral:', date);
      return res.status(400).json({
        success: false,
        message: 'Las reservas solo se pueden hacer de lunes a sábado',
      });
    }

    // Obtener las reservaciones existentes para ese día y sala
    const reservations = await Reservation.findAll({
      where: {
        Rid: roomId,
        date: date as string,
      },
      attributes: ['startTime', 'endTime'],
      raw: true,
    });

    console.log('Reservaciones existentes:', reservations);

    // Generar slots disponibles (intervalos de 30 min)
    const availableSlots = [];
    let currentTime = dayjs(`2000-01-01 ${WORK_START}`);
    const endTimeObj = dayjs(`2000-01-01 ${WORK_END}`);

    while (currentTime.isBefore(endTimeObj)) {
      const slotStart = currentTime.format('HH:mm');
      const slotEnd = currentTime.add(30, 'minute').format('HH:mm');

      // Verificar si este slot está disponible
      const isAvailable = !reservations.some((res: any) => {
        try {
          const resStart = dayjs(`2000-01-01 ${res.startTime}`);
          const resEnd = dayjs(`2000-01-01 ${res.endTime}`);
          const slotStartTime = dayjs(`2000-01-01 ${slotStart}`);
          const slotEndTime = dayjs(`2000-01-01 ${slotEnd}`);

          return (
            (slotStartTime.isSameOrAfter(resStart) && slotStartTime.isBefore(resEnd)) ||
            (slotEndTime.isAfter(resStart) && slotEndTime.isSameOrBefore(resEnd)) ||
            (slotStartTime.isBefore(resStart) && slotEndTime.isAfter(resEnd))
          );
        } catch (e) {
          console.error('Error comparing times:', e);
          return false;
        }
      });

      if (isAvailable) {
        availableSlots.push({
          start: slotStart,
          end: slotEnd,
        });
      }

      currentTime = currentTime.add(30, 'minute');
    }

    console.log('Slots disponibles:', availableSlots);

    return res.status(200).json({
      success: true,
      availableSlots,
    });
  } catch (error) {
    console.error('Error al obtener slots disponibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los slots disponibles',
      error: (error as any).message,
    });
  }
};

// Crear una reservación
export const createReservation = async (req: Request, res: Response): Promise<any> => {
  try {
    const { roomId, date, startTime, endTime, reason, participants } = req.body;
    const userId = (req as any).userId;

    // Validaciones
    if (!roomId || !date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos',
      });
    }

    if (!isValidReservationDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha no es válida. Debe estar dentro de los próximos 7 días',
      });
    }

    if (!isWorkDay(date)) {
      return res.status(400).json({
        success: false,
        message: 'Las reservas solo se pueden hacer de lunes a sábado',
      });
    }

    if (!isWithinWorkHours(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: `El horario debe estar entre ${WORK_START} y ${WORK_END}`,
      });
    }

    if (!isValidDuration(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: `La duración mínima es ${MIN_DURATION} minutos`,
      });
    }

    // Verificar que la sala existe
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada',
      });
    }

    // Verificar que no haya conflictos de horarios
    const conflict = await Reservation.findOne({
      where: {
        Rid: roomId,
        date: date,
        [Op.or]: [
          {
            startTime: { [Op.lt]: endTime },
            endTime: { [Op.gt]: startTime },
          },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una reserva en este horario para esta sala',
      });
    }

    // Validar participantes si existen
    let participantsList: number[] = [];
    if (participants && Array.isArray(participants) && participants.length > 0) {
      const validParticipants = await User.findAll({
        where: {
          Uid: { [Op.in]: participants },
        },
        attributes: ['Uid', 'email'],
      });

      if (validParticipants.length !== participants.length) {
        return res.status(400).json({
          success: false,
          message: 'Uno o más participantes no existen',
        });
      }

      participantsList = validParticipants.map((p) => p.Uid);
    }

    // Crear la reservación
    const reservation = await Reservation.create({
      Uid: userId,
      Rid: roomId,
      date,
      startTime,
      endTime,
      reason,
      participants: participantsList,
    });

    // Obtener datos completos para enviar en respuesta y email
    const fullReservation = await Reservation.findByPk(reservation.ReservationId, {
      include: [
        { model: User, attributes: ['Uid', 'email', 'name', 'lastName'] },
        { model: Room, attributes: ['Rid', 'name'] },
      ],
    });

    // Enviar emails de confirmación
    try {
      const creatorUser = await User.findByPk(userId, {
        attributes: ['email', 'name', 'lastName'],
      });

      if (creatorUser && creatorUser.email) {
        await sendReservationEmail(
          creatorUser.email,
          creatorUser.name,
          fullReservation,
          'confirmation'
        );
      }

      // Enviar emails a participantes
      if (participantsList.length > 0) {
        const participantsEmails = await User.findAll({
          where: { Uid: { [Op.in]: participantsList } },
          attributes: ['email', 'name'],
        });

        for (const participant of participantsEmails) {
          if (participant.email) {
            await sendReservationEmail(
              participant.email,
              participant.name,
              fullReservation,
              'invitation'
            );
          }
        }
      }
    } catch (emailError) {
      console.error('Error al enviar correos:', emailError);
      // No fallar la creación de reserva si hay error con email
    }

    return res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      reservation: fullReservation,
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la reserva',
    });
  }
};

// Obtener todas las reservaciones
export const getAllReservations = async (req: Request, res: Response): Promise<any> => {
  try {
    const { month, year } = req.query;

    let whereClause: any = {};

    if (month && year) {
      const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
      const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

      whereClause.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['Uid', 'email', 'name', 'lastName'] },
        { model: Room, attributes: ['Rid', 'name'] },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      reservations,
    });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas',
    });
  }
};

// Obtener reservaciones de un usuario
export const getUserReservations = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { month, year } = req.query;

    let whereClause: any = { Uid: userId };

    if (month && year) {
      const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
      const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

      whereClause.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['Uid', 'email', 'name', 'lastName'] },
        { model: Room, attributes: ['Rid', 'name'] },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      reservations,
    });
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas',
    });
  }
};

// Actualizar una reservación
export const updateReservation = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, reason, participants } = req.body;
    const userId = (req as any).userId;

    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada',
      });
    }

    // Solo el creador puede modificar
    if (reservation.Uid !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar esta reserva',
      });
    }

    // Validaciones
    if (date && !isValidReservationDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha no es válida',
      });
    }

    if (date && !isWorkDay(date)) {
      return res.status(400).json({
        success: false,
        message: 'Las reservas solo se pueden hacer de lunes a sábado',
      });
    }

    if (startTime && endTime && !isWithinWorkHours(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: `El horario debe estar entre ${WORK_START} y ${WORK_END}`,
      });
    }

    if (startTime && endTime && !isValidDuration(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: `La duración mínima es ${MIN_DURATION} minutos`,
      });
    }

    const newDate = date || reservation.date;
    const newStartTime = startTime || reservation.startTime;
    const newEndTime = endTime || reservation.endTime;

    // Verificar conflictos
    const conflict = await Reservation.findOne({
      where: {
        Rid: reservation.Rid,
        date: newDate,
        ReservationId: { [Op.ne]: id },
        [Op.or]: [
          {
            startTime: { [Op.lt]: newEndTime },
            endTime: { [Op.gt]: newStartTime },
          },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una reserva en este horario para esta sala',
      });
    }

    // Validar y actualizar participantes
    let participantsList = reservation.participants;
    if (participants !== undefined) {
      if (Array.isArray(participants) && participants.length > 0) {
        const validParticipants = await User.findAll({
          where: { Uid: { [Op.in]: participants } },
          attributes: ['Uid'],
        });

        if (validParticipants.length !== participants.length) {
          return res.status(400).json({
            success: false,
            message: 'Uno o más participantes no existen',
          });
        }

        participantsList = validParticipants.map((p) => p.Uid);
      } else {
        participantsList = [];
      }
    }

    // Actualizar reserva
    await reservation.update({
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      reason: reason || reservation.reason,
      participants: participantsList,
    });

    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        { model: User, attributes: ['Uid', 'email', 'name', 'lastName'] },
        { model: Room, attributes: ['Rid', 'name'] },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la reserva',
    });
  }
};

// Cancelar una reservación
export const cancelReservation = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada',
      });
    }

    // Solo el creador puede cancelar
    if (reservation.Uid !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta reserva',
      });
    }

    await reservation.destroy();

    return res.status(200).json({
      success: true,
      message: 'Reserva cancelada exitosamente',
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cancelar la reserva',
    });
  }
};
