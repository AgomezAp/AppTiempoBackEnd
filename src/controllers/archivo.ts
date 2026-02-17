import { Request, Response } from "express";
import { Archivo } from "../models/archivo";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseId } from "../utils/parseId";

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../public/uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Middleware para validar que el usuario sea admin
export const validateAdmin = (req: any, res: Response, next: any): any => {
  const token = req.headers["authorization"];
  
  if (!token) {
    return res.status(401).json({
      msg: "Acceso denegado - Token no proporcionado",
    });
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded: any = jwt.verify(
      token.slice(7),
      process.env.SECRET_KEY || "ptrYxZyMticytOs8eqKW17niMy8RR1JS"
    );

    // Verificar si el rol es administrador
    if (decoded.role !== "Admin") {
      return res.status(403).json({
        msg: "Acceso denegado - Solo administradores pueden realizar esta acción",
      });
    }

    const userId = decoded.userId ?? decoded.Uid;
    if (!userId) {
      return res.status(401).json({
        msg: "Token inválido",
      });
    }

    req.user = decoded;
    req.userId = Number(userId);
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      msg: "Token inválido",
    });
  }
};

// Middleware para validar token (sin verificar rol)
export const validateToken = (req: any, res: Response, next: any): any => {
  const token = req.headers["authorization"];
  
  if (!token) {
    return res.status(401).json({
      msg: "Acceso denegado - Token no proporcionado",
    });
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded: any = jwt.verify(
      token.slice(7),
      process.env.SECRET_KEY || "ptrYxZyMticytOs8eqKW17niMy8RR1JS"
    );

    const userId = decoded.userId ?? decoded.Uid;
    if (!userId) {
      return res.status(401).json({
        msg: "Token inválido",
      });
    }

    req.user = decoded;
    req.userId = Number(userId);
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      msg: "Token inválido",
    });
  }
};

// Obtener todos los archivos
export const getArchivos = async (req: Request, res: Response): Promise<any> => {
  try {
    const archivos = await Archivo.findAll({
      where: { estado: 1 },
      order: [["fechaSubida", "DESC"]],
    });

    res.status(200).json({
      message: "Archivos obtenidos exitosamente",
      archivos,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener archivos",
      message: error.message || error,
    });
  }
};

// Obtener archivos por categoría
export const getArchivosPorCategoria = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { categoria } = req.params;

  try {
    const archivos = await Archivo.findAll({
      where: { categoria, estado: 1 },
      order: [["fechaSubida", "DESC"]],
    });

    res.status(200).json({
      message: `Archivos de categoría ${categoria} obtenidos exitosamente`,
      archivos,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener archivos por categoría",
      message: error.message || error,
    });
  }
};

// Obtener un archivo por ID
export const getArchivo = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const archivo = await Archivo.findByPk(parseId(id));

    if (!archivo) {
      return res.status(404).json({
        msg: `No existe un archivo con el id ${id}`,
      });
    }

    res.status(200).json({
      message: "Archivo obtenido exitosamente",
      archivo,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener el archivo",
      message: error.message || error,
    });
  }
};

// Crear un nuevo archivo (solo admin)
export const createArchivo = async (req: any, res: Response): Promise<any> => {
  try {
    const { nombre, descripcion, tipo, categoria } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        msg: "No se ha subido ningún archivo",
      });
    }

    const url = `/uploads/${req.file.filename}`;

    const nuevoArchivo = await Archivo.create({
      nombre,
      descripcion,
      url,
      tipo,
      categoria,
      fechaSubida: new Date(),
      estado: 1,
    });

    res.status(201).json({
      message: "Archivo creado exitosamente",
      archivo: nuevoArchivo,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al crear el archivo",
      message: error.message || error,
    });
  }
};

// Actualizar un archivo (solo admin)
export const updateArchivo = async (req: any, res: Response): Promise<any> => {
  const { id } = req.params;
  const { nombre, descripcion, tipo, categoria } = req.body;

  try {
    const archivo = await Archivo.findByPk(parseId(id));

    if (!archivo) {
      return res.status(404).json({
        msg: `No existe un archivo con el id ${id}`,
      });
    }

    let url = archivo.url;

    // Si se subió un nuevo archivo, eliminar el anterior y actualizar la URL
    if (req.file) {
      const oldFilePath = path.join(__dirname, "../../public", archivo.url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      url = `/uploads/${req.file.filename}`;
    }

    await archivo.update({
      nombre: nombre || archivo.nombre,
      descripcion: descripcion || archivo.descripcion,
      url,
      tipo: tipo || archivo.tipo,
      categoria: categoria || archivo.categoria,
    });

    res.status(200).json({
      message: "Archivo actualizado exitosamente",
      archivo,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al actualizar el archivo",
      message: error.message || error,
    });
  }
};

// Eliminar un archivo (solo admin) - eliminación lógica
export const deleteArchivo = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const archivo = await Archivo.findByPk(parseId(id));

    if (!archivo) {
      return res.status(404).json({
        msg: `No existe un archivo con el id ${id}`,
      });
    }

    // Eliminación lógica
    await archivo.update({ estado: 0 });

    res.status(200).json({
      message: "Archivo eliminado exitosamente",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al eliminar el archivo",
      message: error.message || error,
    });
  }
};

// Eliminar físicamente un archivo (solo admin)
export const deleteArchivoFisico = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { id } = req.params;

  try {
    const archivo = await Archivo.findByPk(parseId(id));

    if (!archivo) {
      return res.status(404).json({
        msg: `No existe un archivo con el id ${id}`,
      });
    }

    // Eliminar archivo físico
    const filePath = path.join(__dirname, "../../public", archivo.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de la base de datos
    await archivo.destroy();

    res.status(200).json({
      message: "Archivo eliminado físicamente",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al eliminar el archivo",
      message: error.message || error,
    });
  }
};
