import {
    Request,
    Response,
  } from 'express';

import { Novedad } from '../models/time';
import { Permiso } from '../models/permisos';
import dayjs from 'dayjs';
import { convertTimeToMinutes } from '../services/Manejo';
import { permisoToNovedad , descontando } from '../services/novedad';

export const convertNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
      const permisos = await Permiso.findAll();
      const novedad = await Novedad.findAll();
      // console.log('permisos:', permisos);
      const novedadJS = novedad.map(nv => nv.toJSON());
      const novedades = permisoToNovedad(permisos, novedadJS);
      // const sumatorias = descontando(novedades)
      // console.log(novedades)
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