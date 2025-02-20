import {
    Request,
    Response,
  } from 'express';

import { Novedad, NovedadHistorico, Sumatoria } from '../models/time';
import { Permiso } from '../models/permisos';
import dayjs from 'dayjs';
import { convertTimeToMinutes } from '../services/Manejo';
import { permisoToNovedad, convertirHora, convertirMinuto } from '../services/novedad';
import sequelize from '../database/connection';
import { normalizeMessageContent } from '@adiwajshing/baileys';

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
  const transaction = await sequelize.transaction();
  try {
    //Obtiene en Novedad las que tengan aceptacion === null
    var novedades = await Novedad.findAll({
      where: {
        aceptacion: null
      }
    });
    //Mapea las novedades obtenidas en formato json
    let novedadJS = novedades.map(nv => nv.toJSON());
    //Verifica que no haya ninguna novedad sin rechazar o sin aceptar
    if(novedadJS.length>0){
      //Se obtienen los datos para mostrar el mensaje de error
      const item = novedadJS[0];
      const fechaobj = new Date(item.Fecha);
      const soloFecha = fechaobj.toISOString().split('T')[0]
      return res.status(400).json({ error: `la novedad de ${item.Name} en la fecha ${soloFecha} no ha sido aceptada o rechazada`})
    }
    //Obtiene en Novedad las que tengan aceptacion === true
    novedades = await Novedad.findAll({
      where: {
        aceptacion: true
      }
    });
    //Mapea las novedades obtenidas en formato json
    novedadJS = novedades.map(nv => nv.toJSON());
    // Si no existe algun registro con aceptacion === true retorna mensaje de aceptacion
    if(novedadJS.length <= 0){
      return res.status(200).json({message : 'Aceptado o rechazado todo'});
    } else { // si existe, mapeo todos los registros sacando Uid, Hora(en minutos), nombre
      const sum = novedadJS.map(nv =>({
        Uid : nv.Nid,
        hora : convertirHora(nv.horas),
        nombre: nv.Name
      }),
    );
    //Si se repide el Uid se agrupa sumando los minutos
    const agrupado: { [key: string]: number }= {};
    sum.forEach(item => {
      if (agrupado[item.Uid]){
        agrupado[item.Uid] += item.hora;
      } else {
        agrupado[item.Uid] = item.hora;
      }
    });
    //recorre agrupado buscando por UID
    for (const uid in agrupado) {
      //minutos acumulados en novedades
      const minutosAcumulados = agrupado[uid];
      //busca en sumatoria por id
      const sumatoria = await Sumatoria.findOne({ where: {Sid: uid}});
      //Si existe el registro
      if (sumatoria) {
        // asigna a actual la cantidad de horas (minutos) extras que tiene el usuario
        const actual = convertirHora(sumatoria.dataValues.Acumulado);
        // Hace la suma de tiempo extra y minutos acumulados en novedades 
        const minutosTotales = actual + minutosAcumulados;
        //busca por id y actualiza el acumulado (convirtiendo al formato)
        await Sumatoria.update(
          {Acumulado: convertirMinuto(minutosTotales)},
          {where: {Sid: uid}}
        );
      } else {
        //Si el registro no existe. lo crea agregandole los datos de sum
        await Sumatoria.create(
          {Sid: uid,
          Name: agrupado.Name,
          Acumulado: convertirMinuto(minutosAcumulados) }
        );
      }
    }
    const todasNovedades = await Novedad.findAll({transaction});
    const todasNovedadesJS = todasNovedades.map(nv => nv.toJSON());
    const novedadHistorico = todasNovedadesJS.map(nv => ({
      Cid: nv.id,
      Nid: nv.Nid,
      Name: nv.Name,
      type : nv.type,
      Fecha: nv.Fecha,
      HoraEntrada: nv.HoraEntrada,
      HoraSalida: nv.HoraSalida,
      description: nv.description,
      horas: nv.horas,
      aceptacion: nv.aceptacion
    }))
    await NovedadHistorico.bulkCreate(novedadHistorico, {transaction});
    await Novedad.destroy({where: {}, transaction});
    await transaction.commit();
    // Cuando termina de recorrer retorna el mensaje de aceptacion
    return res.status(200).json({message : 'Aceptado o rechazado todo este'});
    
    }
  } catch (error) {
    await transaction.rollback()
    //En caso de error retorna mensaje de error
    console.error('Error al aceptar las novedades:', error);
    return res.status(500).json({ error: 'Error al aceptar las novedades' });
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