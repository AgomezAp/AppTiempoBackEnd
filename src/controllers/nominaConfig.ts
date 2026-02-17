import { parseId } from '../utils/parseId'
import { Request, Response } from 'express';
import NominaConfig from '../models/nominaConfig';

// Obtener la configuración vigente
export const getConfigVigente = async (req: Request, res: Response): Promise<any> => {
  try {
    const config = await NominaConfig.findOne({
      where: { vigente: true },
      order: [['anio', 'DESC']]
    });

    if (!config) {
      // Si no hay configuración, crear una por defecto
      const configDefault = await NominaConfig.create({
        salarioMinimo: 1423500,
        auxilioTransporte: 200000,
        porcentajeSalud: 0.04,
        porcentajePension: 0.04,
        anio: new Date().getFullYear(),
        vigente: true
      });
      return res.json(configDefault);
    }

    res.json(config);
  } catch (error: any) {
    console.error('Error obteniendo configuración vigente:', error);
    res.status(500).json({
      error: 'Error al obtener la configuración de nómina',
      message: error.message
    });
  }
};

// Obtener todas las configuraciones (historial)
export const getAllConfigs = async (req: Request, res: Response): Promise<any> => {
  try {
    const configs = await NominaConfig.findAll({
      order: [['anio', 'DESC']]
    });

    res.json(configs);
  } catch (error: any) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({
      error: 'Error al obtener las configuraciones',
      message: error.message
    });
  }
};

// Crear nueva configuración
export const createConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      salarioMinimo,
      auxilioTransporte,
      porcentajeSalud = 0.04,
      porcentajePension = 0.04,
      anio,
      vigente = false
    } = req.body;

    // Validaciones
    if (!salarioMinimo || !auxilioTransporte || !anio) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: salarioMinimo, auxilioTransporte, anio'
      });
    }

    // Si se marca como vigente, desactivar las demás
    if (vigente) {
      await NominaConfig.update(
        { vigente: false },
        { where: { vigente: true } }
      );
    }

    const nuevaConfig = await NominaConfig.create({
      salarioMinimo,
      auxilioTransporte,
      porcentajeSalud,
      porcentajePension,
      anio,
      vigente
    });

    res.status(201).json(nuevaConfig);
  } catch (error: any) {
    console.error('Error creando configuración:', error);
    res.status(500).json({
      error: 'Error al crear la configuración',
      message: error.message
    });
  }
};

// Actualizar configuración existente
export const updateConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      salarioMinimo,
      auxilioTransporte,
      porcentajeSalud,
      porcentajePension,
      anio,
      vigente
    } = req.body;

    const config = await NominaConfig.findByPk(parseId(id));

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // Si se marca como vigente, desactivar las demás
    if (vigente && !config.vigente) {
      await NominaConfig.update(
        { vigente: false },
        { where: { vigente: true } }
      );
    }

    await config.update({
      salarioMinimo: salarioMinimo ?? config.salarioMinimo,
      auxilioTransporte: auxilioTransporte ?? config.auxilioTransporte,
      porcentajeSalud: porcentajeSalud ?? config.porcentajeSalud,
      porcentajePension: porcentajePension ?? config.porcentajePension,
      anio: anio ?? config.anio,
      vigente: vigente ?? config.vigente
    });

    res.json(config);
  } catch (error: any) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      error: 'Error al actualizar la configuración',
      message: error.message
    });
  }
};

// Activar/Desactivar configuración
export const toggleVigencia = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const config = await NominaConfig.findByPk(parseId(id));

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // Desactivar todas las demás configuraciones
    await NominaConfig.update(
      { vigente: false },
      { where: { vigente: true } }
    );

    // Activar esta configuración
    await config.update({ vigente: true });

    res.json(config);
  } catch (error: any) {
    console.error('Error cambiando vigencia:', error);
    res.status(500).json({
      error: 'Error al cambiar la vigencia',
      message: error.message
    });
  }
};

// Eliminar configuración
export const deleteConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const config = await NominaConfig.findByPk(parseId(id));

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // No permitir eliminar la configuración vigente
    if (config.vigente) {
      return res.status(400).json({
        error: 'No se puede eliminar la configuración vigente. Primero activa otra configuración.'
      });
    }

    await config.destroy();

    res.json({ message: 'Configuración eliminada correctamente' });
  } catch (error: any) {
    console.error('Error eliminando configuración:', error);
    res.status(500).json({
      error: 'Error al eliminar la configuración',
      message: error.message
    });
  }
};

