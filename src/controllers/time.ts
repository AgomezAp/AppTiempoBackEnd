import {
    Request,
    Response,
  } from 'express';

import {processXML} from '../services/Manejo'
import { Registro } from '../models/time';
import multer from 'multer';


// Controlador para convertir XML a JSON
export const convertXml = async (req: Request, res: Response): Promise<void> => {
    try {
        const { xml }: {xml: string} = req.body.xml;
        if (!xml) {
            res.status(400).json({ success: false, message: 'XML data is required' });
            return;
        }
        const jsonData = await processXML();
        res.status(200).json({ success: true, data: jsonData });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage }).single('xml');
// export const horarios = async (req: Request, res: Response): Promise<any> => {
//   upload(req, res, async (err) => {
//     if (err) {
//       return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
//     }
//     const datos = processXML();
//     try {
//       // Crear permiso asociado al usuario
//       const horario = await Registro.create(datos);
//       res.status(200).json({
//         message: 'Permiso creado con éxito',
//         horario,
//       });
      
//     } catch (err: any) {
//       console.error(err);
//       res.status(500).json({
//         msg: 'Error al crear el permiso',
//         error: err,
//       });
//     }
//   });
// };

export const registrarHorarios = async( req: Request, res: Response): Promise<any> => {
    try {
        const datos = await processXML();
        const horario = await Registro.create(datos);
        res.status(200).json({
            message: "Registros añadidos",
            horario,
        });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({
            error: "Problemas al agregar los registros",
            message: error.message || error,
        });
    }
};

export const getHorario = async (req: Request, res: Response): Promise<any> => {
    const listahorario = await Registro.findAll();
    res.json(listahorario);
}

export const getHorarioById = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    try {
        const registro = await Registro.findByPk(id);
        if(!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        res.status(200).json({
            message: `Empleado con ID ${id} encontrado`,
            registro,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id}`,
            error: error.message || error,
        });
    }
};

export const updateSalidaById = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const {salida} = req.body;

    try {
        const registro = await Registro.findByPk(id);

        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        await Registro.update(
            {Salida:salida},
            {where: {id}}
        );
        res.status(200).json({
            message: `Hora de salida del empleado con ID ${id} actualizado correctamente`
        });
    } catch (error:any) {
        console.error(error);
        res.status(500).json({
            message: `Error al actualizar el producto con ID ${id}`,
            error: error.message || error,
        });
    }
};