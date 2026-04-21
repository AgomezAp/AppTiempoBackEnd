import { Request, Response } from 'express';
import { CompensacionHoras } from '../models/compensacionHoras';
import { User } from '../models/user';

/* ─── GUARDAR O ACTUALIZAR plan del usuario en sesión ───────────── */
export const guardarPlan = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { nombreEmpleado, cargo, mesGenerador, mesCompensacion, anio, horasAcumuladas, observaciones, filas } = req.body;

    if (!nombreEmpleado || !mesGenerador || !mesCompensacion || !anio || !filas) {
      return res.status(400).json({ msg: 'Faltan campos requeridos' });
    }

    // Upsert: si ya existe un plan del mismo usuario para ese mes/año se actualiza
    const [plan, created] = await (CompensacionHoras as any).findOrCreate({
      where: { Uid: userId, mesGenerador, mesCompensacion, anio },
      defaults: { nombreEmpleado, cargo, horasAcumuladas, observaciones, filas },
    });

    if (!created) {
      await plan.update({ nombreEmpleado, cargo, horasAcumuladas, observaciones, filas });
    }

    return res.status(200).json({ msg: created ? 'Plan guardado' : 'Plan actualizado', plan });
  } catch (error) {
    console.error('Error guardarPlan:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

/* ─── OBTENER plan del usuario en sesión ────────────────────────── */
export const getMiPlan = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const planes = await (CompensacionHoras as any).findAll({
      where: { Uid: userId },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(planes);
  } catch (error) {
    console.error('Error getMiPlan:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

/* ─── OBTENER TODOS los planes (solo Admin) ─────────────────────── */
export const getTodosLosPlanes = async (req: Request, res: Response): Promise<any> => {
  try {
    const role = (req as any).userRole;
    if (role !== 'Admin') {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const planes = await (CompensacionHoras as any).findAll({
      include: [{ model: User, as: 'usuario', attributes: ['name', 'lastName', 'cargo', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(planes);
  } catch (error) {
    console.error('Error getTodosLosPlanes:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

/* ─── ELIMINAR un plan (solo Admin o el propio usuario) ─────────── */
export const eliminarPlan = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const role = (req as any).userRole;
    const { id } = req.params;

    const plan = await (CompensacionHoras as any).findByPk(id);
    if (!plan) return res.status(404).json({ msg: 'Plan no encontrado' });

    if (role !== 'Admin' && plan.Uid !== userId) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    await plan.destroy();
    return res.status(200).json({ msg: 'Plan eliminado' });
  } catch (error) {
    console.error('Error eliminarPlan:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};
