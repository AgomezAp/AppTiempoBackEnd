import {
    Request,
    Response,
  } from 'express';

import { Novedad, Sumatoria } from '../models/time';
import { Permiso } from '../models/permisos';
import dayjs from 'dayjs';
import { convertTimeToMinutes } from '../services/Manejo';
import { permisoToNovedad, convertirHora, convertirMinuto } from '../services/novedad';

export const convertNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
      const permisos = await Permiso.findAll();
      const novedad = await Novedad.findAll();
      // console.log('permisos:', permisos);
      const novedadJS = novedad.map(nv => nv.toJSON());
      const novedades = permisoToNovedad(permisos, novedadJS);
      console.log('Novedades:', novedades);
      const newNovedades = await Novedad.bulkCreate(novedades);
      res.status(200).json(newNovedades);          
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las novedades' });        
    }
};

export const getNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
        const listaNovedades = await Novedad.findAll({
          order: [['id', 'ASC']]
        });
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

export const updateNovedadHora = async (req: Request, res: Response): Promise<any> =>{
  const {id , horas} = req.body;
  try {
    if(!horas) {
      return res.status(400).json({ error: 'Falta el campo horas' });
    }
    const novedad = await Novedad.findByPk(id);
    if (!novedad){
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }
    await Novedad.update({horas}, { where: { id } });
    res.status(200).json({ message: 'Novedad actualizada' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al actualizar la novedad',
      message: error.message,
    });
  }
};

export const updateNovedadEstado = async (req: Request, res: Response): Promise<any> =>{
  const {id , aceptacion} = req.body;
  try {
    const novedad = await Novedad.findByPk(id);
    if (!novedad){
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }
    await Novedad.update({aceptacion}, { where: { id } });
    res.status(200).json({ message: 'Novedad actualizada' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al actualizar la novedad',
      message: error.message,
    });
  }
};

export const deleteNovedad = async (req: Request, res: Response): Promise<any> => {
  try {
    await Novedad.destroy({ where: {} });
    res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
  } catch (error) {
    console.error('Error al eliminar las novedades:', error);
    res.status(500).json({ error: 'Error al eliminar las novedades' });
  }
}


export const aceptarTodo = async (req: Request, res: Response): Promise<any> => {
  try {
    var novedades = await Novedad.findAll({
      where: {
        aceptacion: null
      }
    });
    var novedadJS = novedades.map(nv => nv.toJSON());
    if(novedadJS.length>0){
      const item= novedadJS[0];
      const fechaobj = new Date(item.Fecha);
      const soloFecha = fechaobj.toISOString().split('T')[0]
      return res.status(400).json({ error: `la novedad de ${item.Name} en la fecha ${soloFecha} no ha sido aceptada o rechazada` })
    }
    novedades = await Novedad.findAll({
      where: {
        aceptacion: true
      }
    });
    novedadJS = novedades.map(nv => nv.toJSON());
    if(novedadJS.length <= 0){
      return res.status(200).json({message : 'Aceptado o rechazado todo'});
    } else {
      const sum = novedadJS.map(nv =>({
        Uid : nv.Nid,
        hora : convertirHora(nv.horas),
        nombre: nv.Name
      }),
    );
    const agrupado: { [key: string]: number }= {};
    sum.forEach(item => {
      if (agrupado[item.Uid]){
        agrupado[item.Uid] += item.hora;
      } else {
        agrupado[item.Uid] = item.hora;
      }
    });
    for (const uid in agrupado) {
      const minutosAcumulados = agrupado[uid];
      const sumatoria = await Sumatoria.findOne({ where: {Sid: uid}});
      if (sumatoria) {
        const actual = convertirHora(sumatoria.dataValues.Acumulado);
        const minutosTotales = actual + minutosAcumulados;
        await Sumatoria.update(
          {Acumulado: convertirMinuto(minutosTotales)},
          {where: {Sid: uid}}
        );
      } else {
        await Sumatoria.create(
          {Sid: uid,
          Name: agrupado.Name,
          Acumulado: convertirMinuto(minutosAcumulados) }
        );
      }
      await Novedad.update(
        {aceptacion: false},
        {where: {
          Nid: uid,
        }}
      );
    }
    return res.status(200).json({message : 'Aceptado o rechazado todo este'});
    
    }
  } catch (error) {
    console.error('Error al aceptar las novedades:', error);
    res.status(500).json({ error: 'Error al aceptar las novedades' });
  }
 
} /*
  1. recibir todos los datos de NOVEDADES ✔️✔️
  2. Verificar que en todos los registros aceptacion sea true o false ✔️✔️
  3. Si alguno es null debe revisar de nuevo cada registro (el usuario) ✔️✔️
  4. Si todos los registros son true o false, se obtienen solamente los registros con aceptacion true
  5. se suman las horas en la tabla SUMATORIA.
  6. se pasan todos los datos en la tabla COPIANOVEDAD
  7 se deja la tabla NOVEDAD vacia

  */