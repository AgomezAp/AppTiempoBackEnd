import { Request, Response } from 'express';
import { HorarioUsuario, generarHorariosEstandar } from '../models/horarioUsuario';
import { User } from '../models/user';

// Obtener horario semanal de un usuario
export const getHorarioUsuario = async (req: Request, res: Response): Promise<any> => {
    const uid = req.params.uid as string;
    try {
        const horarios = await HorarioUsuario.findAll({
            where: { Uid: uid },
            order: [['diaSemana', 'ASC']],
        });

        if (horarios.length === 0) {
            // Si no tiene horarios, generar los estándar y devolverlos
            await generarHorariosEstandar(parseInt(uid, 10));
            const nuevosHorarios = await HorarioUsuario.findAll({
                where: { Uid: uid },
                order: [['diaSemana', 'ASC']],
            });
            return res.status(200).json(nuevosHorarios);
        }

        res.status(200).json(horarios);
    } catch (error: any) {
        console.error('Error al obtener horario del usuario:', error);
        res.status(500).json({ error: 'Error al obtener horario del usuario', details: error.message });
    }
};

// Actualizar horario semanal completo de un usuario
export const updateHorarioUsuario = async (req: Request, res: Response): Promise<any> => {
    const uid = req.params.uid as string;
    const { horarios } = req.body;

    try {
        if (!Array.isArray(horarios) || horarios.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de horarios' });
        }

        // Validar que el usuario exista
        const user = await User.findByPk(uid);
        if (!user) {
            return res.status(404).json({ message: `Usuario con ID ${uid} no encontrado` });
        }

        for (const h of horarios) {
            if (h.diaSemana < 1 || h.diaSemana > 6) {
                return res.status(400).json({ message: `Día de semana inválido: ${h.diaSemana}. Debe ser 1 (Lunes) a 6 (Sábado)` });
            }
            if (h.jornadaMinutos < 0 || h.almuerzoMinutos < 0) {
                return res.status(400).json({ message: 'Los minutos no pueden ser negativos' });
            }
        }

        for (const h of horarios) {
            const [registro, created] = await HorarioUsuario.findOrCreate({
                where: { Uid: uid, diaSemana: h.diaSemana },
                defaults: {
                    Uid: parseInt(uid, 10),
                    diaSemana: h.diaSemana,
                    jornadaMinutos: h.jornadaMinutos,
                    almuerzoMinutos: h.almuerzoMinutos,
                    activo: h.activo !== undefined ? h.activo : true,
                },
            });

            if (!created) {
                await HorarioUsuario.update(
                    {
                        jornadaMinutos: h.jornadaMinutos,
                        almuerzoMinutos: h.almuerzoMinutos,
                        activo: h.activo !== undefined ? h.activo : true,
                    },
                    { where: { Uid: uid, diaSemana: h.diaSemana } }
                );
            }
        }

        const horariosActualizados = await HorarioUsuario.findAll({
            where: { Uid: uid },
            order: [['diaSemana', 'ASC']],
        });

        res.status(200).json({
            message: 'Horario actualizado correctamente',
            horarios: horariosActualizados,
        });
    } catch (error: any) {
        console.error('Error al actualizar horario del usuario:', error);
        res.status(500).json({ error: 'Error al actualizar horario', details: error.message });
    }
};

// Inicializar horarios estándar para todos los usuarios que no los tengan
export const inicializarHorariosGlobal = async (req: Request, res: Response): Promise<any> => {
    try {
        const usuarios = await User.findAll({ attributes: ['Uid'] });
        let count = 0;

        for (const user of usuarios) {
            const uid = user.getDataValue('Uid');
            const existentes = await HorarioUsuario.findAll({ where: { Uid: uid } });
            if (existentes.length === 0) {
                await generarHorariosEstandar(uid);
                count++;
            }
        }

        res.status(200).json({
            message: `Horarios inicializados para ${count} usuarios`,
        });
    } catch (error: any) {
        console.error('Error al inicializar horarios:', error);
        res.status(500).json({ error: 'Error al inicializar horarios', details: error.message });
    }
};
