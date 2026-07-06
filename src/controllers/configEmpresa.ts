import { Request, Response } from 'express';
import { ConfigEmpresa } from '../models/configEmpresa';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../public');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  },
});
export const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

export const getEmpresas = async (_req: Request, res: Response): Promise<any> => {
  try {
    const empresas = await ConfigEmpresa.findAll({ order: [['codigo', 'ASC']] });
    return res.status(200).json(empresas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener configuración de empresas', error });
  }
};

export const getEmpresaByCodigo = async (req: Request, res: Response): Promise<any> => {
  const codigo = String(req.params.codigo);
  try {
    const empresa = await ConfigEmpresa.findOne({ where: { codigo: codigo.toUpperCase() } });
    if (!empresa) return res.status(404).json({ msg: 'Empresa no encontrada' });
    return res.status(200).json(empresa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener empresa', error });
  }
};

export const updateEmpresa = async (req: Request, res: Response): Promise<any> => {
  const codigo = String(req.params.codigo);
  const { nombre, nit, gerente, cargo_gerente, cedula_gerente, direccion, telefono, email, header_color, accent_color } = req.body;

  try {
    const empresa = await ConfigEmpresa.findOne({ where: { codigo: codigo.toUpperCase() } });
    if (!empresa) return res.status(404).json({ msg: 'Empresa no encontrada' });

    await empresa.update({
      ...(nombre !== undefined && { nombre }),
      ...(nit !== undefined && { nit }),
      ...(gerente !== undefined && { gerente }),
      ...(cargo_gerente !== undefined && { cargo_gerente }),
      ...(cedula_gerente !== undefined && { cedula_gerente }),
      ...(direccion !== undefined && { direccion }),
      ...(telefono !== undefined && { telefono }),
      ...(email !== undefined && { email }),
      ...(header_color !== undefined && { header_color }),
      ...(accent_color !== undefined && { accent_color }),
    });

    return res.status(200).json(empresa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al actualizar empresa', error });
  }
};

export const uploadLogoEmpresa = async (req: Request, res: Response): Promise<any> => {
  const codigo = String(req.params.codigo);
  const { tipo } = req.query; // 'logo' | 'watermark'

  try {
    const empresa = await ConfigEmpresa.findOne({ where: { codigo: codigo.toUpperCase() } });
    if (!empresa) return res.status(404).json({ msg: 'Empresa no encontrada' });

    if (!req.file) return res.status(400).json({ msg: 'No se envió ningún archivo' });

    const filename = req.file.filename;
    if (tipo === 'watermark') {
      await empresa.update({ watermark_url: filename });
    } else {
      await empresa.update({ logo_url: filename });
    }

    return res.status(200).json({ msg: 'Imagen actualizada', filename, empresa });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al subir imagen', error });
  }
};
