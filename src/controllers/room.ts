import { Request, Response } from 'express';
import { Room } from '../models/room';
import { User } from '../models/user';

// Obtener todas las salas
export const getAllRooms = async (req: Request, res: Response): Promise<any> => {
  try {
    const rooms = await Room.findAll({
      order: [['name', 'ASC']],
    });
    return res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error('Error al obtener salas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las salas',
    });
  }
};

// Obtener una sala por ID
export const getRoomById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada',
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('Error al obtener sala:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la sala',
    });
  }
};

// Crear una nueva sala (solo administradores)
export const createRoom = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.body;
    const userRole = (req as any).userRole;

    // Verificar si el usuario es administrador (comparar de forma case-insensitive)
    if (!userRole || userRole.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden crear salas',
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la sala es requerido',
      });
    }

    // Verificar si la sala ya existe
    const existingRoom = await Room.findOne({
      where: { name: name.trim() },
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una sala con ese nombre',
      });
    }

    const room = await Room.create({
      name: name.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Sala creada exitosamente',
      room,
    });
  } catch (error) {
    console.error('Error al crear sala:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la sala',
    });
  }
};

// Actualizar una sala (solo administradores)
export const updateRoom = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userRole = (req as any).userRole;

    // Verificar si el usuario es administrador
    if (!userRole || userRole.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden actualizar salas',
      });
    }

    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada',
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la sala es requerido',
      });
    }

    // Verificar si el nuevo nombre ya existe en otra sala
    if (name.trim() !== room.name) {
      const existingRoom = await Room.findOne({
        where: { name: name.trim() },
      });

      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una sala con ese nombre',
        });
      }
    }

    await room.update({ name: name.trim() });

    return res.status(200).json({
      success: true,
      message: 'Sala actualizada exitosamente',
      room,
    });
  } catch (error) {
    console.error('Error al actualizar sala:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la sala',
    });
  }
};

// Eliminar una sala (solo administradores)
export const deleteRoom = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userRole = (req as any).userRole;

    // Verificar si el usuario es administrador
    if (!userRole || userRole.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden eliminar salas',
      });
    }

    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada',
      });
    }

    await room.destroy();

    return res.status(200).json({
      success: true,
      message: 'Sala eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar sala:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la sala',
    });
  }
};
