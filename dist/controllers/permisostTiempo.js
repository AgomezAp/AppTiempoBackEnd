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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermiso = void 0;
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage }).single('soporte');
const createPermiso = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(500).json({ msg: 'Error al subir el archivo', error: err });
        }
        const { Pid, nombre, tipoPermiso, correoPersonal, correoLider, horaSalida, horaEntrada, fecha, observacion } = req.body;
        const soporte = req.file ? req.file.buffer : null;
        if (!Pid || !nombre || !tipoPermiso || !correoPersonal || !correoLider || !horaEntrada || !horaSalida || !!fecha || !!observacion) {
            return res.status(500).json({ err: "No llenaste los datos" });
        }
    }));
});
exports.createPermiso = createPermiso;
