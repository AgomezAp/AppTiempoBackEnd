import {
    Request,
    Response,
  } from 'express';

import { Novedad } from '../models/time';
import { Permiso } from '../models/permisos';

export const convertNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
      const permisos = await Permiso.findAll();
      const transicion = permisos.map(permiso => permiso.toJSON());
      const novedades = transicion.map(item => ({
        Nid: item.Nid,
        Name: item.Name,
        type: item.tipo,
        Fecha: item.Fecha,
        HoraEntrada: item.HoraEntrada,
        HoraSalida: item.HoraSalida,
        description: item.observaciones,
        horas: 0,
        aceptacion: false
      }));
      const newNovedades = await Novedad.bulkCreate(novedades);  
      res.status(200).json(newNovedades);          
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las novedades' });        
    }
};

