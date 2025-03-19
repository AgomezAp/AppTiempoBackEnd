import {
    Request,
    Response,
  } from 'express';

import { Novedad, NovedadHistorico, Sumatoria } from '../models/time';
import { Permiso } from '../models/permisos';
import dayjs from 'dayjs';
import { permisoToNovedad, convertirHora, convertirMinuto } from '../services/novedad';
import sequelize from '../database/connection';
import { Op } from 'sequelize'

export const convertNovedad = async (req: Request, res: Response): Promise<any> => {
    try {
      const permisos = await Permiso.findAll({where: {novedad: false}});
      const novedadBD = await Novedad.findAll();
      const novedadJS = novedadBD.map(nv => nv.toJSON());
      const novedades = permisoToNovedad(permisos, novedadJS);
      const newNovedades = await Novedad.bulkCreate(novedades);
      await Permiso.update({ novedad: true }, { where: { novedad: false } })
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

export const getNovedadHistorico = async (req: Request, res: Response): Promise<any> => {
  try {
      const listaNovedades = await NovedadHistorico.findAll({
        order: [['Cid', 'ASC']]
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
  const { ids } = req.body;
  try {
    if (ids && ids.length > 0){
      await Novedad.destroy({
        where: {
          id: {
            [Op.in]: ids
          }
        }
      });
      res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
    } else {
      await Novedad.destroy({ where: {} });
      res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
    }
    
  } catch (error) {
    console.error('Error al eliminar las novedades:', error);
    res.status(500).json({ error: 'Error al eliminar las novedades' });
  }
}

export const errorNovedad = async (req: Request, res: Response): Promise<any> => {
  const { Cid } = req.body;
  if (!Cid) {
    return res.status(400).json({error: 'falta id'});
  }
  const transaction = await sequelize.transaction();
  try {
    const novedadHistorico = await NovedadHistorico.findByPk(Cid, {transaction});
    if (!novedadHistorico) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Novedad no encontrada en la tabla NovedadHistorico' });
    } else {
      // Convertir el registro a un objeto JSON
      const novedadData = novedadHistorico.toJSON();
      const novedad = {
        id: novedadData.Cid,
        Nid: novedadData.Nid,
        Name: novedadData.Name,
        type : novedadData.type,
        Fecha: novedadData.Fecha,
        HoraEntrada: novedadData.HoraEntrada,
        HoraSalida: novedadData.HoraSalida,
        description: novedadData.description,
        horas: novedadData.horas,
        aceptacion: novedadData.aceptacion
      }
      if (novedadData.aceptacion === false){
        // Insertar el registro en la tabla Novedad
        await Novedad.create(novedad, { transaction });
         // Eliminar el registro de la tabla NovedadHistorico
        await NovedadHistorico.destroy({ where: { Cid } , transaction});
        await transaction.commit();
        res.status(200).json({ message: 'Novedad movida de NovedadHistorico a Novedad' });
      } else {
        const hMinutos = convertirHora(novedadData.horas); 
        const sum = typeof hMinutos === "number" ? -hMinutos : 0;
        const sumatoria = await Sumatoria.findOne({ where: {Sid: novedadData.Nid}, transaction});
        if (sumatoria) {
          const actual = convertirHora(sumatoria.dataValues.Acumulado);
          const minutosTotales = actual + sum;
          await Sumatoria.update(
            {Acumulado: convertirMinuto(minutosTotales)},
            {where: {Sid: novedadData.Nid},
            transaction}
          );
        } else {
          //Si el registro no existe. lo crea agregandole los datos de sum
          await Sumatoria.create(
            {
              Sid: novedadData.Nid,
              Name: novedadData.Name,
              Acumulado: convertirMinuto(-sum)
            },
            { transaction }
          );
        }
        await Novedad.create(novedad, { transaction });
        await NovedadHistorico.destroy({ where: { Cid } , transaction});
        await transaction.commit();
        res.status(200).json({ message: 'Novedad movida de NovedadHistorico a Novedad' });
      }
    }
  } catch (error) {
    await transaction.rollback()
    console.error('Error al mover la novedad:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({ error: 'Error al mover la novedad', message: errorMessage });
  }
}

export const aceptarTodo = async (req: Request, res: Response): Promise<any> => {
    const transaction = await sequelize.transaction();
    try {
      let novedades = await Novedad.findAll({
        where: {
          aceptacion: [true, false],
        },
        transaction
      });
      let novedadJS = novedades.map(nv => nv.toJSON());

      if (novedadJS.length === 0) {
        return res.status(404).json({message: "No hay novedades para procesar"})
      }
      //Mapea las novedades obtenidas en formato json
      const sum = novedadJS
        .filter(nv => nv.aceptacion === true)
        .map(nv => ({
          Uid: nv.Nid,
          hora: convertirHora(nv.horas),
          nombre: nv.Name
        }));
      const agrupado: { [key: string]: number }= {};
      sum.forEach(item => {
        if (agrupado[item.Uid]){
          agrupado[item.Uid] += item.hora;
        } else {
          agrupado[item.Uid] = item.hora;
        }});
      for (const uid in agrupado) {
        //minutos acumulados en novedades
        const minutosAcumulados = agrupado[uid];
        //busca en sumatoria por id
        const sumatoria = await Sumatoria.findOne({ where: {Sid: uid}, transaction});
        //Si existe el registro
        if (sumatoria) {
          // asigna a actual la cantidad de horas (minutos) extras que tiene el usuario
          const actual = convertirHora(sumatoria.dataValues.Acumulado);
          // Hace la suma de tiempo extra y minutos acumulados en novedades 
          const minutosTotales = actual + minutosAcumulados;
          //busca por id y actualiza el acumulado (convirtiendo al formato)
          await Sumatoria.update(
            {Acumulado: convertirMinuto(minutosTotales)},
            {where: {Sid: uid},
            transaction}
          );
          } else {
          const registro = sum.find((item) => item.Uid === parseInt(uid));
          const nombre = registro ? registro.nombre : `Usuario con id ${uid} no encontrado`;
          //Si el registro no existe. lo crea agregandole los datos de sum
          await Sumatoria.create(
            {
              Sid: uid,
              Name: nombre,
              Acumulado: convertirMinuto(minutosAcumulados)
            },
            { transaction }
          );
          }
      }
      const todasNovedades = await Novedad.findAll({where: {aceptacion: {[Op.or]: [true, false]}},transaction});
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
      await Novedad.destroy({where: {aceptacion: {[Op.or]: [true, false]}}, transaction});
      await transaction.commit();
      return res.status(200).json({message : 'Aceptado o rechazado todo este'});
    } catch (error) {
      await transaction.rollback()
    //En caso de error retorna mensaje de error
    console.error('Error al aceptar las novedades:', error);
    return res.status(500).json({ error: 'Error al aceptar las novedades' });
    }
}