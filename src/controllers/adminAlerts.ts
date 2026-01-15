import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Permiso } from '../models/permisos';
import Alert from '../models/alert';
import { convertirHora } from '../services/novedad';

// Helper: compute minutes between two HH:MM strings (entrada/salida)
function diffMinutes(entrada?: string | null, salida?: string | null): number {
  if (!entrada || !salida) return 0;
  const e = convertirHora(entrada);
  const s = convertirHora(salida);
  return Math.abs(s - e);
}

export async function generateDailyAlerts() {
  // compute for previous day
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const start = new Date(yesterday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);

  // fetch permisos in that range
  const permisos = await Permiso.findAll({
    where: {
      fecha: {
        [Op.between]: [start, end],
      },
    },
  });

  const byUser: Record<number, { Name: string; minutes: number; Uid: number }> = {};

  permisos.forEach((p: any) => {
    const uid = p.Uid;
    const name = p.nombre || p.Name || 'N/A';
    const mins = diffMinutes(p.horaEntrada, p.horaSalida);
    if (!byUser[uid]) byUser[uid] = { Name: name, minutes: 0, Uid: uid };
    byUser[uid].minutes += mins;
  });

  const ALERT_THRESHOLD = 8 * 60 + 30; // 510 minutes -> 8:30

  const created: any[] = [];

  for (const uidStr of Object.keys(byUser)) {
    const u = byUser[Number(uidStr)];
    if (Math.abs(u.minutes) >= ALERT_THRESHOLD) {
      // create alert
      const a = await Alert.create({
        Uid: u.Uid,
        Name: u.Name,
        type: 'Ausentismo',
        minutes: u.minutes,
        periodoInicio: start,
        periodoFin: end,
        notified: false,
        createdAt: new Date(),
      });
      created.push(a);
    }
  }

  return created;
}

export const getAlerts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from && to) {
      where.periodoInicio = { [Op.gte]: new Date(String(from)) };
      where.periodoFin = { [Op.lte]: new Date(String(to)) };
    }

    console.log('Fetching alerts with query:', where);
    const alerts = await Alert.findAll({ where, order: [['createdAt', 'DESC']] });
    console.log('Found alerts:', alerts.length);
    res.status(200).json({ alerts });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message || error });
  }
};

// Endpoint para generar alertas manualmente (para testing)
export const triggerGenerateAlerts = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('Triggering manual alert generation...');
    const created = await generateDailyAlerts();
    console.log('Alerts created:', created.length);
    res.status(200).json({ message: 'Alerts generated', count: created.length, alerts: created });
  } catch (error: any) {
    console.error('Error triggering alerts:', error);
    res.status(500).json({ error: error.message || error });
  }
};

// Endpoint para eliminar todas las alertas (para testing)
export const deleteAllAlerts = async (req: Request, res: Response): Promise<any> => {
  try {
    const deleted = await Alert.destroy({ where: {} });
    console.log('Alerts deleted:', deleted);
    res.status(200).json({ message: 'All alerts deleted', count: deleted });
  } catch (error: any) {
    console.error('Error deleting alerts:', error);
    res.status(500).json({ error: error.message || error });
  }
};
