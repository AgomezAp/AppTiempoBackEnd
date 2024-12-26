"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSalidaById = exports.getHorarioById = exports.getHorario = exports.registrarHorarios = exports.convertXml = void 0;
const Manejo_1 = require("../services/Manejo");
const time_1 = require("../models/time");
// Controlador para convertir XML a JSON
const convertXml = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { xml } = req.body.xml;
        if (!xml) {
            res.status(400).json({ success: false, message: 'XML data is required' });
            return;
        }
        const jsonData = yield (0, Manejo_1.processXML)();
        res.status(200).json({ success: true, data: jsonData });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.convertXml = convertXml;
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
const registrarHorarios = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const datos = yield (0, Manejo_1.processXML)();
        const horario = yield time_1.Registro.create(datos);
        res.status(200).json({
            message: "Registros añadidos",
            horario,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Problemas al agregar los registros",
            message: error.message || error,
        });
    }
});
exports.registrarHorarios = registrarHorarios;
const getHorario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const listahorario = yield time_1.Registro.findAll();
    res.json(listahorario);
});
exports.getHorario = getHorario;
const getHorarioById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const registro = yield time_1.Registro.findByPk(id);
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        res.status(200).json({
            message: `Empleado con ID ${id} encontrado`,
            registro,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.getHorarioById = getHorarioById;
const updateSalidaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { salida } = req.body;
    try {
        const registro = yield time_1.Registro.findByPk(id);
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        yield time_1.Registro.update({ Salida: salida }, { where: { id } });
        res.status(200).json({
            message: `Hora de salida del empleado con ID ${id} actualizado correctamente`
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error al actualizar el producto con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.updateSalidaById = updateSalidaById;
