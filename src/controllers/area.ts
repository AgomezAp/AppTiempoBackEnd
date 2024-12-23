import {
  Request,
  Response,
} from 'express';

import { Area } from '../models/area';

export const getAllAreas = async (req: Request, res: Response): Promise<any>  => {
  try {
    const areas = await Area.findAll();
    res.status(200).json(areas);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener las áreas", error });
  }
};

export const getAreaById = async (req: Request, res: Response): Promise<any>  => {
  const { Aid } = req.params;
  try {
    const area = await Area.findOne({where:{Aid:Aid}})
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
    }
    return res.json({
      msg:`Area con Id${Aid} encontrado exitosamente`,
      data: area
  })
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener el área", error });
  }
};

export const createArea = async (req: Request, res: Response): Promise<any> => {
  const { name, correoLider } = req.body;

  // Verificar si el área ya existe
  const area = await Area.findOne({ where: { name: name } });
  if (area) {
    return res.status(400).json({
      msg: `Área ${name} ya existe`
    });
  }

  try {
    await Area.create({
      name: name,
      correoLider: correoLider
    });
    return res.json({
      msg: `El área ${name} ha sido creada con éxito`
    });
  } catch (error) {
    return res.status(500).json({
      msg: `Error al crear el área ${name}`,
      error
    });
  }
};


export const updateArea = async (req: Request, res: Response): Promise<any>  => {
  const { Aid } = req.params;
  const { name } = req.body;
  try {
    const area = await Area.findByPk(Aid);
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
    }
    area.name = name;
    await area.save();
    res.status(200).json(area);
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el área", error });
  }
};

export const deleteArea = async (req: Request, res: Response): Promise<any> => {
  const { Aid } = req.params;
  try {
    const area: any = await Area.findOne({where:{Aid:Aid}});
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${Aid} no encontrada` });
    }
    await area.destroy({where:{Aid:Aid}});
    res.status(200).json({ msg: "Área eliminada con éxito" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar el área", error });
  }
};