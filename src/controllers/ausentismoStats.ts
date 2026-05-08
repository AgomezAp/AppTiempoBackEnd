import { parseId } from '../utils/parseId'
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Permiso } from '../models/permisos';
import { User } from '../models/user';
import { NominaConfig } from '../models/nominaConfig';

// Tipos de permiso médico que generan costo para la empresa
const TIPOS_CITA_MEDICA = ['Cita médica', 'Cita odontológica'];

// Cada cita médica/odontológica = 2 horas de permiso
const HORAS_POR_CITA = 2;

// Jornada laboral: 9h30m → 9.5 horas/día, 30 días/mes
const HORAS_JORNADA_DIA = 9.5;
const DIAS_MES = 30;

/**
 * Calcula la tarifa por hora de un empleado.
 * tarifa_hora = salario_mensual / 30 / 9.5
 */
function calcularTarifaHora(salarioMensual: number): number {
  if (!salarioMensual || salarioMensual <= 0) return 0;
  return salarioMensual / DIAS_MES / HORAS_JORNADA_DIA;
}

/**
 * DEBUG ENDPOINT: Ver todos los tipos de permisos en BD
 */
export const getPermisosTypes = async (req: Request, res: Response): Promise<any> => {
  try {
    const permisos = await Permiso.findAll({ raw: true, attributes: ['tipo'] });
    const tiposUnicos = [...new Set(permisos.map((p: any) => p.tipo))];
    const totalUsers = await User.count();
    res.status(200).json({
      tipos_encontrados: tiposUnicos,
      total_permisos: permisos.length,
      total_users: totalUsers,
      tipos_buscados: TIPOS_CITA_MEDICA,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

/**
 * PATCH /api/admin/ausentismo/permiso/:id/toggle-cancelado
 * Marca o desmarca un permiso como cancelado (no tomado).
 */
export const togglePermisoCancelado = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const permiso = await Permiso.findByPk(parseId(id));
    
    if (!permiso) {
      return res.status(404).json({ success: false, message: 'Permiso no encontrado' });
    }

    // Toggle del campo cancelado
    const nuevoEstado = !permiso.getDataValue('cancelado');
    await permiso.update({ cancelado: nuevoEstado });

    console.log(`🔄 Permiso ${id} marcado como ${nuevoEstado ? 'CANCELADO' : 'ACTIVO'}`);

    res.status(200).json({
      success: true,
      message: nuevoEstado ? 'Permiso marcado como no tomado' : 'Permiso restaurado',
      cancelado: nuevoEstado,
    });
  } catch (error: any) {
    console.error('Error toggling permiso cancelado:', error);
    res.status(500).json({ error: error.message || error });
  }
};

/**
 * GET /api/admin/ausentismo/stats
 * 
 * ENFOQUE: Consulta TODOS los usuarios activos de la tabla users,
 * luego cuenta cuántos permisos médicos/odontológicos tiene cada uno.
 * Los permisos marcados como cancelados NO se cuentan en el costo.
 */
export const getAusentismoStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;

    // 1. Obtener TODOS los usuarios activos (status = 1)
    const allUsers = await User.findAll({
      where: { status: 1 },
      attributes: ['Uid', 'name', 'lastName', 'email', 'salario', 'empresa', 'cargo'],
      raw: true,
    });

    console.log(`👥 Total usuarios activos: ${allUsers.length}`);

    // 2. Obtener salario mínimo vigente como fallback
    const configVigente = await NominaConfig.findOne({ where: { vigente: true } });
    const salarioMinimo = configVigente ? Number(configVigente.getDataValue('salarioMinimo')) : 1423500;
    console.log(`💰 Salario mínimo fallback: ${salarioMinimo}`);

    // 3. Obtener los permisos médicos/odontológicos (con filtro de fecha opcional)
    const permisoWhere: any = {
      tipo: { [Op.in]: TIPOS_CITA_MEDICA },
    };
    if (from && to) {
      permisoWhere.fecha = {
        [Op.between]: [new Date(String(from) + 'T00:00:00'), new Date(String(to) + 'T23:59:59')],
      };
    }

    const permisosRaw = await Permiso.findAll({
      where: permisoWhere,
      order: [['fecha', 'DESC']],
      raw: true,
    });
    console.log(`🩺 Total permisos médicos/odonto encontrados: ${permisosRaw.length}`);

    // 4. Agrupar permisos por Uid (incluyendo info de cancelado)
    const permisosPorUsuario: Record<number, Array<{ id: number; fecha: string; tipo: string; cancelado: boolean }>> = {};
    permisosRaw.forEach((p: any) => {
      if (!permisosPorUsuario[p.Uid]) {
        permisosPorUsuario[p.Uid] = [];
      }
      permisosPorUsuario[p.Uid].push({
        id: p.id,
        fecha: p.fecha ? new Date(p.fecha).toISOString().substring(0, 10) : 'N/A',
        tipo: p.tipo,
        cancelado: p.cancelado || false,
      });
    });

    // 5. Construir el array byUser con TODOS los empleados
    let totalPermisosGlobal = 0;
    let totalHorasGlobal = 0;
    let totalCostoGlobal = 0;
    let empleadosConPermisos = 0;

    const byUser = allUsers.map((user: any) => {
      const salario = user.salario && Number(user.salario) > 0
        ? Number(user.salario)
        : salarioMinimo;
      const tarifaHora = calcularTarifaHora(salario);

      const permisosUsuario = permisosPorUsuario[user.Uid] || [];
      
      // Solo contar permisos NO cancelados para el costo
      const permisosActivos = permisosUsuario.filter(p => !p.cancelado);
      const citasMedicas = permisosActivos.filter(p => p.tipo === 'Cita médica').length;
      const citasOdontologicas = permisosActivos.filter(p => p.tipo === 'Cita odontológica').length;
      const totalPermisos = citasMedicas + citasOdontologicas;
      const totalHoras = totalPermisos * HORAS_POR_CITA;
      const costoPorPermiso = tarifaHora * HORAS_POR_CITA;
      const costoTotal = totalPermisos * costoPorPermiso;

      // Acumular totales globales (solo activos)
      totalPermisosGlobal += totalPermisos;
      totalHorasGlobal += totalHoras;
      totalCostoGlobal += costoTotal;
      if (totalPermisos > 0) empleadosConPermisos++;

      return {
        Uid: user.Uid,
        nombre: `${user.name || ''} ${user.lastName || ''}`.trim() || 'N/A',
        cargo: user.cargo || 'N/A',
        empresa: user.empresa || 'N/A',
        salario: Math.round(salario),
        tarifaHora: Math.round(tarifaHora),
        citasMedicas,
        citasOdontologicas,
        totalPermisos,
        totalHoras,
        costoTotal: Math.round(costoTotal),
        // Incluir TODOS los permisos (activos y cancelados) con su estado
        permisos: permisosUsuario.map(p => ({
          id: p.id,
          fecha: p.fecha,
          tipo: p.tipo,
          costo: p.cancelado ? 0 : Math.round(costoPorPermiso),
          cancelado: p.cancelado,
        })),
      };
    })
    // Ordenar: primero los que tienen permisos (mayor costo primero), luego el resto por nombre
    .sort((a, b) => {
      if (b.costoTotal !== a.costoTotal) return b.costoTotal - a.costoTotal;
      return a.nombre.localeCompare(b.nombre);
    });

    const stats = {
      summary: {
        totalPermisos: totalPermisosGlobal,
        totalHoras: totalHorasGlobal,
        totalCosto: Math.round(totalCostoGlobal),
        empleadosAfectados: empleadosConPermisos,
        horasPorCita: HORAS_POR_CITA,
        salarioMinimoReferencia: salarioMinimo,
      },
      byUser,
    };

    console.log(`📊 Stats: ${byUser.length} usuarios, ${totalPermisosGlobal} permisos activos, costo total: $${Math.round(totalCostoGlobal)}`);

    res.status(200).json({ success: true, stats });
  } catch (error: any) {
    console.error('Error calculando estadísticas de costo médico:', error);
    res.status(500).json({ error: error.message || error });
  }
};

/**
 * GET /api/admin/ausentismo/summary
 * Resumen rápido para KPI cards (solo permisos activos).
 */
export const getAusentismoSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;
    const where: any = {
      tipo: { [Op.in]: TIPOS_CITA_MEDICA },
      [Op.or]: [{ cancelado: false }, { cancelado: null }], // Solo permisos activos
    };

    if (from && to) {
      where.fecha = {
        [Op.between]: [new Date(String(from) + 'T00:00:00'), new Date(String(to) + 'T23:59:59')],
      };
    }

    const permisosRaw = await Permiso.findAll({ where, raw: true });
    const users = await User.findAll({ attributes: ['Uid', 'salario'], raw: true });

    const userMap: Record<number, any> = {};
    users.forEach((u: any) => {
      userMap[u.Uid] = u;
    });

    const configVigente = await NominaConfig.findOne({ where: { vigente: true } });
    const salarioMinimo = configVigente ? Number(configVigente.getDataValue('salarioMinimo')) : 1423500;

    let totalCosto = 0;
    const uidSet = new Set<number>();

    permisosRaw.forEach((p: any) => {
      const user = userMap[p.Uid];
      const salario = user?.salario && Number(user.salario) > 0 ? Number(user.salario) : salarioMinimo;
      totalCosto += calcularTarifaHora(salario) * HORAS_POR_CITA;
      uidSet.add(p.Uid);
    });

    res.status(200).json({
      success: true,
      summary: {
        totalPermisos: permisosRaw.length,
        totalHoras: permisosRaw.length * HORAS_POR_CITA,
        totalCosto: Math.round(totalCosto),
        empleadosAfectados: uidSet.size,
      },
    });
  } catch (error: any) {
    console.error('Error calculando resumen:', error);
    res.status(500).json({ error: error.message || error });
  }
};


/**
 * GET /api/admin/ausentismo/incapacidades
 * Resumen de incapacidades médicas y laborales por colaborador.
 * Requiere que el campo fechaFin esté registrado en el permiso para calcular días.
 */
export const getIncapacidades = async (req: Request, res: Response): Promise<any> => {
  try {
    const { from, to } = req.query;

    const where: any = {
      tipo: { [Op.in]: ['Incapacidad médica', 'Incapacidad laboral'] },
    };
    if (from && to) {
      where.fecha = {
        [Op.between]: [new Date(String(from) + 'T00:00:00'), new Date(String(to) + 'T23:59:59')],
      };
    }

    const permisos = await Permiso.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['Uid', 'name', 'lastName', 'cargo', 'empresa'],
        } as any,
      ],
      order: [['fecha', 'DESC']],
    });

    // Agrupar por usuario
    const byUserMap: Record<number, any> = {};
    permisos.forEach((p: any) => {
      const uid = Number(p.Uid);
      const user = p.user;

      if (!byUserMap[uid]) {
        byUserMap[uid] = {
          Uid: uid,
          nombre: user ? `${user.name} ${user.lastName}`.trim() : 'N/A',
          cargo: user?.cargo || 'N/A',
          empresa: user?.empresa || 'N/A',
          cantidad: 0,
          totalDias: 0,
          incapacidades: [],
        };
      }

      // Calcular días: fechaFin - fecha + 1 (inclusive)
      let dias = 0;
      if (p.fecha && p.fechaFin) {
        const inicio = new Date(p.fecha);
        const fin = new Date(p.fechaFin);
        dias = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1);
      }

      byUserMap[uid].cantidad++;
      byUserMap[uid].totalDias += dias;
      byUserMap[uid].incapacidades.push({
        id: p.id,
        tipo: p.tipo,
        fecha: p.fecha ? new Date(p.fecha).toISOString().substring(0, 10) : null,
        fechaFin: p.fechaFin ? new Date(p.fechaFin).toISOString().substring(0, 10) : null,
        dias,
        observaciones: p.observaciones || null,
        cancelado: p.cancelado || false,
      });
    });

    const result = Object.values(byUserMap)
      .filter((u: any) => u.cantidad > 0)
      .sort((a: any, b: any) => b.totalDias - a.totalDias);

    const totalIncapacidades = result.reduce((s: number, u: any) => s + u.cantidad, 0);
    const totalDias = result.reduce((s: number, u: any) => s + u.totalDias, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalIncapacidades,
        totalDias,
        empleadosAfectados: result.length,
      },
      byUser: result,
    });
  } catch (error: any) {
    console.error('Error al obtener incapacidades:', error);
    res.status(500).json({ error: error.message || error });
  }
};

const TIPOS_INCAPACIDAD = ['Incapacidad médica', 'Incapacidad laboral'];

/**
 * POST /api/admin/ausentismo/incapacidades/consolidar
 * Migra los registros históricos donde cada día de incapacidad era un formulario separado.
 *
 * Algoritmo:
 *  1. Agrupa por Uid + tipo todos los registros sin fechaFin
 *  2. Dentro de cada grupo, elimina duplicados del mismo día (conserva el id más bajo)
 *  3. Agrupa fechas consecutivas con tolerancia ≤ 3 días (cubre fines de semana)
 *  4. Por cada cluster: actualiza el primer registro con fechaFin = última fecha, borra el resto
 *  5. Registros aislados: establece fechaFin = fecha (1 día)
 */
export const consolidarIncapacidades = async (req: Request, res: Response): Promise<any> => {
  try {
    const permisos = await Permiso.findAll({
      where: {
        tipo: { [Op.in]: TIPOS_INCAPACIDAD },
        fechaFin: { [Op.is]: null as any },
        cancelado: { [Op.not]: true },
      },
      order: [['Uid', 'ASC'], ['tipo', 'ASC'], ['fecha', 'ASC']],
      raw: true,
    });

    if (permisos.length === 0) {
      return res.json({ success: true, message: 'No hay registros sin fechaFin para consolidar', consolidados: 0, eliminados: 0 });
    }

    // Agrupar por Uid + tipo
    const groups: Record<string, any[]> = {};
    for (const p of permisos as any[]) {
      const key = `${p.Uid}|${p.tipo}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    let consolidados = 0;
    let eliminados = 0;

    for (const records of Object.values(groups)) {
      // Paso 1: eliminar duplicados del mismo día (conservar el de id más bajo)
      const byFecha: Record<string, any> = {};
      const toDelete: number[] = [];

      for (const r of records) {
        const fechaKey = new Date(r.fecha).toISOString().substring(0, 10);
        if (!byFecha[fechaKey]) {
          byFecha[fechaKey] = r;
        } else {
          // Conservar el registro más antiguo (id más bajo)
          if (r.id < byFecha[fechaKey].id) {
            toDelete.push(byFecha[fechaKey].id);
            byFecha[fechaKey] = r;
          } else {
            toDelete.push(r.id);
          }
        }
      }

      // Paso 2: agrupar fechas únicas en clusters consecutivos (gap ≤ 3 días)
      const unique = Object.values(byFecha).sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );

      const clusters: any[][] = [];
      let current: any[] = [unique[0]];

      for (let i = 1; i < unique.length; i++) {
        const prev = new Date(unique[i - 1].fecha).getTime();
        const curr = new Date(unique[i].fecha).getTime();
        const gapDays = Math.round((curr - prev) / 86400000);

        if (gapDays <= 3) {
          current.push(unique[i]);
        } else {
          clusters.push(current);
          current = [unique[i]];
        }
      }
      clusters.push(current);

      // Paso 3: procesar cada cluster
      for (const cluster of clusters) {
        const primary = cluster[0];
        const lastFecha = cluster[cluster.length - 1].fecha;

        // Siempre establecer fechaFin (aunque sea el mismo día, para consistencia)
        await Permiso.update({ fechaFin: lastFecha }, { where: { id: primary.id } });
        consolidados++;

        if (cluster.length > 1) {
          const extraIds = cluster.slice(1).map((r: any) => r.id);
          toDelete.push(...extraIds);
        }
      }

      if (toDelete.length > 0) {
        await Permiso.destroy({ where: { id: { [Op.in]: toDelete } } });
        eliminados += toDelete.length;
      }
    }

    res.json({
      success: true,
      message: `Consolidación completada: ${consolidados} episodios procesados, ${eliminados} registros duplicados eliminados`,
      consolidados,
      eliminados,
    });
  } catch (error: any) {
    console.error('Error consolidando incapacidades:', error);
    res.status(500).json({ error: error.message || error });
  }
};

