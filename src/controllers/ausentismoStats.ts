import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { NovedadHistorico, Registro } from '../models/time';
import { User } from '../models/user';
import { convertirHora, convertirMinuto } from '../services/novedad';

// Helper to convert HH:MM string to minutes
function hoursToMinutes(horaStr?: string | null): number {
  if (!horaStr) return 0;
  return convertirHora(horaStr);
}

// Build YYYY-MM-DD key in local time (neutral to timezone offsets)
function dateKeyLocal(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Round minutes down to multiples of 30 (only :00 or :30)
function floorToHalfHour(mins: number): number {
  const sign = mins < 0 ? -1 : 1;
  const abs = Math.abs(mins);
  const hours = Math.floor(abs / 60);
  const remainder = abs % 60;
  const rounded = remainder < 30 ? 0 : 30; // floor to 0 or 30
  return sign * (hours * 60 + rounded);
}

// Helper to convert minutes to HH:MM string applying floor to :00/:30
function minutesToHours(mins: number): string {
  const rounded = floorToHalfHour(mins);
  return convertirMinuto(rounded);
}

export const getAusentismoStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;
    const where: any = {};

    // Filter by date range if provided
    if (from && to) {
      where.Fecha = {
        [Op.between]: [new Date(String(from)), new Date(String(to))],
      };
    }

    // Fetch all NovedadHistorico records (already processed/approved)
    const novedades = await NovedadHistorico.findAll({
      where,
      order: [['Fecha', 'DESC']],
    });

    // Fetch Registros in range to cross-check marcaciones
    const registroWhere: any = {};
    if (from && to) {
      registroWhere.Fecha = {
        [Op.between]: [new Date(String(from)), new Date(String(to))],
      };
    }
    const registros = await Registro.findAll({ where: registroWhere });

    // Fetch all users for mapping
    const users = await User.findAll();
    const userMap: Record<number, any> = {};
    users.forEach((u: any) => {
      userMap[u.Uid] = { name: u.nombre, email: u.email, area: u.Area };
    });

    // Calculate statistics
    const stats = calculateStats(novedades, registros, userMap);

    res.status(200).json({
      success: true,
      stats,
      records: novedades,
    });
  } catch (error: any) {
    console.error('Error calculating ausentismo stats:', error);
    res.status(500).json({ error: error.message || error });
  }
};

function calculateStats(novedades: any[], registros: any[], userMap: Record<number, any>) {
  // Allowed absence types to include in statistics
  const ALLOWED_TYPES = new Set<string>([
    'Permiso personal de todo el día',
    'Salida Temprano',
    'Permiso personal por horas',
    'Llegada tarde por factores externos',
    'Incapacidad médica',
    'Día de la familia',
    'Suspensión por proceso disciplinario',
  ]);

  // Expected workday duration in minutes (9h30)
  const WORKDAY_MIN = 9 * 60 + 30;

  // Index registros by user and date
  const registroMap: Record<number, Record<string, { workedMinutes: number; totalStr?: string }>> = {};
  registros.forEach((reg: any) => {
    const uid = reg.Hid;
    const key = dateKeyLocal(new Date(reg.Fecha));
    if (!registroMap[uid]) registroMap[uid] = {};

    const totalMinutes = reg.Total
      ? hoursToMinutes(reg.Total)
      : Math.max(0, Math.round((new Date(reg.Salida).getTime() - new Date(reg.Entrada).getTime()) / 60000));

    if (!registroMap[uid][key]) {
      registroMap[uid][key] = { workedMinutes: 0, totalStr: reg.Total };
    }
    registroMap[uid][key].workedMinutes += Math.max(0, totalMinutes);
  });

  // Filter: only allowed types (aceptacion handled in logic below)
  const filtered = novedades.filter((n: any) => ALLOWED_TYPES.has(n.type || ''));

  console.log(`📊 Total novedades: ${novedades.length}, Filtradas por tipo permitido: ${filtered.length}`);
  console.log('📋 Tipos permitidos:', Array.from(ALLOWED_TYPES));

  const byUser: Record<
    number,
    {
      name: string;
      totalMinutes: number;
      count: number;
      byType: Record<string, { minutes: number; count: number }>;
    }
  > = {};

  const byType: Record<string, { minutes: number; count: number }> = {};
  let totalMinutes = 0;
  let totalCount = 0;
  let skippedCount = 0;

  filtered.forEach((nov: any) => {
    const uid = nov.Nid;
    const type = nov.type || 'Desconocido';
    const name = nov.Name || userMap[uid]?.name || 'N/A';
    const dateKey = dateKeyLocal(new Date(nov.Fecha));
    const reg = registroMap[uid]?.[dateKey];

    let absenceMinutes = 0;
    let reason = '';

    if (reg) {
      // Hay registro ese día: calcular ausencia real como diferencia
      const worked = reg.workedMinutes;
      const missing = Math.max(0, WORKDAY_MIN - worked);
      
      // Solo contar si efectivamente trabajó menos de la jornada completa
      if (missing > 0) {
        const fromNovedad = Math.abs(hoursToMinutes(nov.horas));
        // Usar el mayor entre lo que falta vs lo declarado en novedad
        absenceMinutes = Math.max(missing, fromNovedad);
        reason = `CON_REGISTRO: trabajó ${worked}min, faltó ${missing}min, novedad=${fromNovedad}min → cuenta ${absenceMinutes}min`;
      } else {
        // Trabajó jornada completa o más: el permiso no se usó
        absenceMinutes = 0;
        reason = `CON_REGISTRO: trabajó ${worked}min >= jornada ${WORKDAY_MIN}min → NO CUENTA (permiso no usado)`;
      }
    } else {
      // Sin registro ese día: validar si es permiso de todo el día
      const isFullDay = type === 'Permiso personal de todo el día' 
        || type === 'Día de la familia' 
        || type === 'Incapacidad médica'
        || type === 'Suspensión por proceso disciplinario';
      
      if (isFullDay) {
        // Permiso de día completo sin registro: contar jornada completa
        const fromNovedad = Math.abs(hoursToMinutes(nov.horas));
        absenceMinutes = fromNovedad || WORKDAY_MIN;
        reason = `SIN_REGISTRO + DIA_COMPLETO: novedad=${fromNovedad}min → cuenta ${absenceMinutes}min`;
      } else {
        // Otros permisos sin registro: no contar (raro, pero puede pasar)
        absenceMinutes = 0;
        reason = `SIN_REGISTRO pero no es día completo (tipo: ${type}) → NO CUENTA`;
      }
    }

    const mins = floorToHalfHour(absenceMinutes);
    
    console.log(`  ${nov.Fecha.toString().substring(0,10)} | ${name} | ${type} | ${reason} | Final: ${mins}min`);
    
    if (mins <= 0) {
      skippedCount++;
      return;
    }

    // Aggregate by user
    if (!byUser[uid]) {
      byUser[uid] = {
        name,
        totalMinutes: 0,
        count: 0,
        byType: {},
      };
    }
    byUser[uid].totalMinutes += mins;
    byUser[uid].count += 1;

    // Per-user breakdown by type
    if (!byUser[uid].byType[type]) {
      byUser[uid].byType[type] = { minutes: 0, count: 0 };
    }
    byUser[uid].byType[type].minutes += mins;
    byUser[uid].byType[type].count += 1;

    // Aggregate by type
    if (!byType[type]) {
      byType[type] = { minutes: 0, count: 0 };
    }
    byType[type].minutes += mins;
    byType[type].count += 1;

    // Global totals
    totalMinutes += mins;
    totalCount += 1;
  });

  console.log(`\n✅ Total contados: ${totalCount}, ❌ Excluidos: ${skippedCount}`);

  // Convert to arrays and sort
  const userStats = Object.entries(byUser)
    .map(([uid, data]) => ({
      Uid: Number(uid),
      Name: data.name,
      totalHours: minutesToHours(data.totalMinutes),
      totalMinutes: data.totalMinutes,
      count: data.count,
      // Average duration per record in minutes, floored to multiples of 30
      average: Math.floor((data.totalMinutes / (data.count || 1)) / 30) * 30,
      byType: Object.entries(data.byType).map(([t, d]) => ({
        type: t,
        hours: minutesToHours(d.minutes),
        minutes: d.minutes,
        count: d.count,
      })),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const typeStats = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      hours: minutesToHours(data.minutes),
      minutes: data.minutes,
      count: data.count,
      percentage: ((data.count / totalCount) * 100).toFixed(2),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalRecords: totalCount,
      totalHours: minutesToHours(totalMinutes),
      totalMinutes,
      // Overall average in minutes, floored to :00/:30
      averagePerRecord: Math.floor((totalMinutes / (totalCount || 1)) / 30) * 30,
      uniqueUsers: Object.keys(byUser).length,
    },
    byUser: userStats,
    byType: typeStats,
    topAbsentees: userStats.slice(0, 10),
  };
}

// Get summary statistics (for KPI cards)
export const getAusentismoSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;
    const where: any = {};

    if (from && to) {
      where.Fecha = {
        [Op.between]: [new Date(String(from)), new Date(String(to))],
      };
    }

    const novedades = await NovedadHistorico.findAll({ where });

    const registroWhere: any = {};
    if (from && to) {
      registroWhere.Fecha = {
        [Op.between]: [new Date(String(from)), new Date(String(to))],
      };
    }
    const registros = await Registro.findAll({ where: registroWhere });

    const users = await User.findAll();
    const userMap: Record<number, any> = {};
    users.forEach((u: any) => {
      userMap[u.Uid] = { name: u.nombre };
    });

    const stats = calculateStats(novedades, registros, userMap);

    res.status(200).json({
      success: true,
      summary: stats.summary,
      topAbsentees: stats.topAbsentees.slice(0, 5),
      typeDistribution: stats.byType.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Error calculating summary:', error);
    res.status(500).json({ error: error.message || error });
  }
};
