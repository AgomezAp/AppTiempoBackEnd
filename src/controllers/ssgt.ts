import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import fs from 'fs';
import path from 'path';
import {
  AccidenteIncidente,
  InvestigacionAccidente,
  EvidenciaAccidente,
  SeguimientoAccion,
} from '../models/ssgt';
import { User } from '../models/user';
import { parseId } from '../utils/parseId';

// ========================================
// ACCIDENTES CRUD
// ========================================

export const crearAccidente = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      fecha, hora, lugar, descripcion, tipoEvento,
      severidad, tipoLesion, parteAfectada, testigos,
      diasIncapacidad, reportadoPor, empresa,
    } = req.body;

    if (!fecha || !hora || !lugar || !descripcion || !tipoEvento || !severidad || !reportadoPor) {
      return res.status(400).json({
        msg: 'Los campos fecha, hora, lugar, descripción, tipo de evento, severidad y reportado por son requeridos',
      });
    }

    if (severidad === 'grave' || severidad === 'mortal') {
      if (!tipoLesion || !parteAfectada) {
        return res.status(400).json({
          msg: 'Para eventos graves o mortales, tipo de lesión y parte afectada son requeridos',
        });
      }
    }

    const accidente = await AccidenteIncidente.create({
      fecha, hora, lugar, descripcion, tipoEvento,
      severidad, tipoLesion, parteAfectada, testigos,
      diasIncapacidad, reportadoPor, empresa,
      estado: 'reportado',
    });

    return res.status(201).json({ msg: 'Reporte creado exitosamente', accidente });
  } catch (error) {
    console.error('Error al crear accidente:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const obtenerAccidentes = async (req: Request, res: Response): Promise<any> => {
  try {
    const { estado, severidad, tipoEvento, fechaDesde, fechaHasta, empresa } = req.query;

    const where: any = {};

    if (estado) where.estado = estado;
    if (severidad) where.severidad = severidad;
    if (tipoEvento) where.tipoEvento = tipoEvento;
    if (empresa) where.empresa = empresa;

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha[Op.gte] = fechaDesde;
      if (fechaHasta) where.fecha[Op.lte] = fechaHasta;
    }

    const accidentes = await AccidenteIncidente.findAll({
      where,
      include: [
        { model: User, as: 'reportante', attributes: ['Uid', 'name', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json(accidentes);
  } catch (error) {
    console.error('Error al obtener accidentes:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const obtenerAccidentePorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);

    const accidente = await AccidenteIncidente.findByPk(id, {
      include: [
        { model: User, as: 'reportante', attributes: ['Uid', 'name', 'lastName'] },
        {
          model: InvestigacionAccidente,
          as: 'investigacion',
          include: [
            { model: User, as: 'responsable', attributes: ['Uid', 'name', 'lastName'] },
          ],
        },
        { model: EvidenciaAccidente, as: 'evidencias' },
        {
          model: SeguimientoAccion,
          as: 'seguimientos',
          include: [
            { model: User, as: 'responsable', attributes: ['Uid', 'name', 'lastName'] },
          ],
        },
      ],
    });

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    return res.json(accidente);
  } catch (error) {
    console.error('Error al obtener accidente:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const actualizarAccidente = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const accidente = await AccidenteIncidente.findByPk(id);

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    const {
      fecha, hora, lugar, descripcion, tipoEvento,
      severidad, tipoLesion, parteAfectada, testigos,
      diasIncapacidad, estado, empresa,
    } = req.body;

    const sev = severidad || accidente.severidad;
    if (sev === 'grave' || sev === 'mortal') {
      const tLesion = tipoLesion !== undefined ? tipoLesion : accidente.tipoLesion;
      const pAfectada = parteAfectada !== undefined ? parteAfectada : accidente.parteAfectada;
      if (!tLesion || !pAfectada) {
        return res.status(400).json({
          msg: 'Para eventos graves o mortales, tipo de lesión y parte afectada son requeridos',
        });
      }
    }

    await accidente.update({
      ...(fecha !== undefined && { fecha }),
      ...(hora !== undefined && { hora }),
      ...(lugar !== undefined && { lugar }),
      ...(descripcion !== undefined && { descripcion }),
      ...(tipoEvento !== undefined && { tipoEvento }),
      ...(severidad !== undefined && { severidad }),
      ...(tipoLesion !== undefined && { tipoLesion }),
      ...(parteAfectada !== undefined && { parteAfectada }),
      ...(testigos !== undefined && { testigos }),
      ...(diasIncapacidad !== undefined && { diasIncapacidad }),
      ...(estado !== undefined && { estado }),
      ...(empresa !== undefined && { empresa }),
    });

    return res.json({ msg: 'Accidente actualizado exitosamente', accidente });
  } catch (error) {
    console.error('Error al actualizar accidente:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const eliminarAccidente = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const accidente = await AccidenteIncidente.findByPk(id);

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    // Eliminar evidencias del filesystem
    const evidencias = await EvidenciaAccidente.findAll({ where: { accidenteId: id } });
    for (const ev of evidencias) {
      try {
        if (fs.existsSync(ev.rutaArchivo)) {
          fs.unlinkSync(ev.rutaArchivo);
        }
      } catch (e) {
        console.error('Error eliminando archivo:', e);
      }
    }

    // Eliminar registros relacionados
    await SeguimientoAccion.destroy({ where: { accidenteId: id } });
    await EvidenciaAccidente.destroy({ where: { accidenteId: id } });
    await InvestigacionAccidente.destroy({ where: { accidenteId: id } });
    await accidente.destroy();

    return res.json({ msg: 'Accidente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar accidente:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// INVESTIGACION
// ========================================

export const crearInvestigacion = async (req: Request, res: Response): Promise<any> => {
  try {
    const accidenteId = parseId(req.params.id);
    const accidente = await AccidenteIncidente.findByPk(accidenteId);

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    const {
      causasInmediatas, causasBasicas, accionesCorrectivas,
      responsableInvestigacion, fechaInvestigacion, conclusiones,
    } = req.body;

    if (!responsableInvestigacion || !fechaInvestigacion) {
      return res.status(400).json({
        msg: 'Responsable de investigación y fecha son requeridos',
      });
    }

    // Upsert: si ya existe una investigacion, actualizarla
    const existente = await InvestigacionAccidente.findOne({ where: { accidenteId } });

    let investigacion;
    if (existente) {
      await existente.update({
        causasInmediatas, causasBasicas, accionesCorrectivas,
        responsableInvestigacion, fechaInvestigacion, conclusiones,
      });
      investigacion = existente;
    } else {
      investigacion = await InvestigacionAccidente.create({
        accidenteId,
        causasInmediatas, causasBasicas, accionesCorrectivas,
        responsableInvestigacion, fechaInvestigacion, conclusiones,
      });
    }

    // Actualizar estado del accidente a en_investigacion
    if (accidente.estado === 'reportado') {
      await accidente.update({ estado: 'en_investigacion' });
    }

    return res.status(201).json({ msg: 'Investigación guardada exitosamente', investigacion });
  } catch (error) {
    console.error('Error al crear investigación:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// EVIDENCIAS
// ========================================

export const subirEvidencia = async (req: Request, res: Response): Promise<any> => {
  try {
    const accidenteId = parseId(req.params.id);
    const accidente = await AccidenteIncidente.findByPk(accidenteId);

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'No se proporcionó ningún archivo' });
    }

    const { tipo, descripcion } = req.body;

    const evidencia = await EvidenciaAccidente.create({
      accidenteId,
      tipo: tipo || 'otro',
      nombreArchivo: req.file.originalname,
      rutaArchivo: req.file.path,
      descripcion,
    });

    return res.status(201).json({ msg: 'Evidencia subida exitosamente', evidencia });
  } catch (error) {
    console.error('Error al subir evidencia:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const eliminarEvidencia = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const evidencia = await EvidenciaAccidente.findByPk(id);

    if (!evidencia) {
      return res.status(404).json({ msg: 'Evidencia no encontrada' });
    }

    // Eliminar archivo del filesystem
    try {
      if (fs.existsSync(evidencia.rutaArchivo)) {
        fs.unlinkSync(evidencia.rutaArchivo);
      }
    } catch (e) {
      console.error('Error eliminando archivo:', e);
    }

    await evidencia.destroy();

    return res.json({ msg: 'Evidencia eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar evidencia:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// SEGUIMIENTO
// ========================================

export const crearSeguimiento = async (req: Request, res: Response): Promise<any> => {
  try {
    const accidenteId = parseId(req.params.id);
    const accidente = await AccidenteIncidente.findByPk(accidenteId);

    if (!accidente) {
      return res.status(404).json({ msg: 'Accidente no encontrado' });
    }

    const { descripcion, responsableId, fechaLimite, observaciones } = req.body;

    if (!descripcion || !responsableId || !fechaLimite) {
      return res.status(400).json({
        msg: 'Descripción, responsable y fecha límite son requeridos',
      });
    }

    const seguimiento = await SeguimientoAccion.create({
      accidenteId,
      descripcion,
      responsableId,
      fechaLimite,
      estado: 'pendiente',
      observaciones,
    });

    return res.status(201).json({ msg: 'Seguimiento creado exitosamente', seguimiento });
  } catch (error) {
    console.error('Error al crear seguimiento:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const actualizarSeguimiento = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const seguimiento = await SeguimientoAccion.findByPk(id);

    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    const { descripcion, responsableId, fechaLimite, estado, observaciones } = req.body;

    await seguimiento.update({
      ...(descripcion !== undefined && { descripcion }),
      ...(responsableId !== undefined && { responsableId }),
      ...(fechaLimite !== undefined && { fechaLimite }),
      ...(estado !== undefined && { estado }),
      ...(observaciones !== undefined && { observaciones }),
    });

    return res.json({ msg: 'Seguimiento actualizado exitosamente', seguimiento });
  } catch (error) {
    console.error('Error al actualizar seguimiento:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// DASHBOARD
// ========================================

export const obtenerDashboard = async (req: Request, res: Response): Promise<any> => {
  try {
    const { year } = req.query;
    const anio = year ? parseInt(String(year), 10) : new Date().getFullYear();

    // Total accidentes e incidentes
    const totalAccidentes = await AccidenteIncidente.count({
      where: {
        tipoEvento: 'accidente',
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
    });

    const totalIncidentes = await AccidenteIncidente.count({
      where: {
        tipoEvento: 'incidente',
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
    });

    // Por severidad
    const porSeveridad = await AccidenteIncidente.findAll({
      attributes: [
        'severidad',
        [fn('COUNT', col('id')), 'total'],
      ],
      where: {
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
      group: ['severidad'],
      raw: true,
    });

    // Por estado
    const porEstado = await AccidenteIncidente.findAll({
      attributes: [
        'estado',
        [fn('COUNT', col('id')), 'total'],
      ],
      where: {
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
      group: ['estado'],
      raw: true,
    });

    // Por mes
    const porMes = await AccidenteIncidente.findAll({
      attributes: [
        [fn('EXTRACT', literal("MONTH FROM fecha")), 'mes'],
        'tipoEvento',
        [fn('COUNT', col('id')), 'total'],
      ],
      where: {
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
      group: [fn('EXTRACT', literal("MONTH FROM fecha")), 'tipoEvento'],
      order: [[fn('EXTRACT', literal("MONTH FROM fecha")), 'ASC']],
      raw: true,
    });

    // Total dias de incapacidad
    const diasIncapacidadResult: any = await AccidenteIncidente.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('diasIncapacidad')), 0), 'totalDias'],
      ],
      where: {
        fecha: {
          [Op.gte]: `${anio}-01-01`,
          [Op.lte]: `${anio}-12-31`,
        },
      },
      raw: true,
    });

    // Seguimientos pendientes
    const seguimientosPendientes = await SeguimientoAccion.count({
      where: {
        estado: { [Op.ne]: 'completado' },
      },
    });

    return res.json({
      anio,
      totalAccidentes,
      totalIncidentes,
      totalDiasIncapacidad: diasIncapacidadResult?.totalDias || 0,
      porSeveridad,
      porEstado,
      porMes,
      seguimientosPendientes,
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};
