import {
    Request,
    Response,
  } from 'express';

import { Novedad } from '../models/time';
import { Permiso } from '../models/permisos';
import dayjs from 'dayjs';
import { convertTimeToMinutes } from '../services/Manejo';

export const convertNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
      const permisos = await Permiso.findAll();
      const novedad = await Novedad.findAll();
      const novedadJS = novedad.map(nv => nv.toJSON());
      const transicion = permisos.map(permiso => permiso.toJSON());
      const idsNovedades = new Set(novedadJS.map(nv => nv.id));
      const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
      const novedades = transicionFiltrada.map(item => {
        const horas = convertTimeToMinutes(item.horaSalida);
        console.log('Horas:', horas, 'tipo', typeof(horas));
        const enHoras = horas / (1000 * 60 * 60);
        console.log('enHoras:', enHoras, 'tipo', typeof(enHoras));
        return {
          id: item.id,
          Nid: item.Uid,
          Name: item.nombre,
          type: item.tipo,
          Fecha: item.fechaInicio,
          HoraEntrada: item.horaRegreso,
          HoraSalida: item.horaSalida,
          description: item.observaciones,
          horas: enHoras,
          aceptacion: false
        };
      });
      const newNovedades = await Novedad.bulkCreate(novedades); 
      res.status(200).json(newNovedades);          
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las novedades' });        
    }
};

export const getNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
        const listaNovedades = await Novedad.findAll();
        const datosConvertidos = listaNovedades.map(registro => {
            const registroConvertido = registro.toJSON();
            return {
                ...registroConvertido,
                Fecha: dayjs.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
            };
        });
        res.json(datosConvertidos);
    } catch (error) {
        console.error('Error al obtener las novedades:', error);
        res.status(500).json({ error: 'Error al obtener las novedades' });        
    }
}

export const deleteNovedad = async (req: Request, res: Response): Promise<any> => {
  try {
    await Novedad.destroy({ where: {} });
    res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
  } catch (error) {
    console.error('Error al eliminar las novedades:', error);
    res.status(500).json({ error: 'Error al eliminar las novedades' });
  }
}