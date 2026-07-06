import { Request, Response } from 'express';
import { DestinatarioPermiso } from '../models/destinatarioPermiso';

export const getDestinatarios = async (req: Request, res: Response): Promise<any> => {
  try {
    const destinatarios = await DestinatarioPermiso.findAll({
      order: [['tipo', 'ASC'], ['nombre', 'ASC']],
    });
    return res.status(200).json(destinatarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener destinatarios', error });
  }
};

export const createDestinatario = async (req: Request, res: Response): Promise<any> => {
  const { email, nombre, tipo, tipos_permiso, es_cc } = req.body;

  if (!email || !tipo) {
    return res.status(400).json({ msg: 'El email y el tipo son obligatorios' });
  }

  try {
    const destinatario = await DestinatarioPermiso.create({
      email: email.trim().toLowerCase(),
      nombre: nombre?.trim() || '',
      tipo,
      tipos_permiso: tipos_permiso || [],
      es_cc: es_cc ?? false,
      activo: true,
    });
    return res.status(201).json(destinatario);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al crear destinatario', error });
  }
};

export const updateDestinatario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);
  const { email, nombre, tipo, tipos_permiso, es_cc, activo } = req.body;

  try {
    const destinatario = await DestinatarioPermiso.findByPk(id);
    if (!destinatario) {
      return res.status(404).json({ msg: 'Destinatario no encontrado' });
    }

    await destinatario.update({
      ...(email !== undefined && { email: email.trim().toLowerCase() }),
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(tipo !== undefined && { tipo }),
      ...(tipos_permiso !== undefined && { tipos_permiso }),
      ...(es_cc !== undefined && { es_cc }),
      ...(activo !== undefined && { activo }),
    });

    return res.status(200).json(destinatario);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al actualizar destinatario', error });
  }
};

export const deleteDestinatario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);

  try {
    const destinatario = await DestinatarioPermiso.findByPk(id);
    if (!destinatario) {
      return res.status(404).json({ msg: 'Destinatario no encontrado' });
    }

    await destinatario.destroy();
    return res.status(200).json({ msg: 'Destinatario eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al eliminar destinatario', error });
  }
};

export const toggleDestinatario = async (req: Request, res: Response): Promise<any> => {
  const id = String(req.params.id);

  try {
    const destinatario = await DestinatarioPermiso.findByPk(id);
    if (!destinatario) {
      return res.status(404).json({ msg: 'Destinatario no encontrado' });
    }

    await destinatario.update({ activo: !destinatario.activo });
    return res.status(200).json(destinatario);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al cambiar estado del destinatario', error });
  }
};
