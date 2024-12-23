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
  const { id } = req.params;
  try {
    const area = await Area.findByPk(id);
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
    }
    res.status(200).json(area);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener el área", error });
  }
};

export const createArea = async (req: Request, res: Response): Promise<any>  => {
  const { name, correoLider } = req.body;
  try {
    const newArea = await Area.create({ name, correoLider });
    res.status(201).json(newArea);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear el área", error });
  }
};

export const updateArea = async (req: Request, res: Response): Promise<any>  => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const area = await Area.findByPk(id);
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
    }
    area.name = name;
    area.description = description;
    await area.save();
    res.status(200).json(area);
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el área", error });
  }
};

export const deleteArea = async (req: Request, res: Response): Promise<any>  => {
  const { id } = req.params;
  try {
    const area = await Area.findByPk(id);
    if (!area) {
      return res.status(404).json({ msg: `Área con ID ${id} no encontrada` });
    }
    await area.destroy();
    res.status(200).json({ msg: "Área eliminada con éxito" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar el área", error });
  }
};
