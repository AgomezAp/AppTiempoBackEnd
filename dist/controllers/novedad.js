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
exports.aceptarTodo = exports.deleteNovedad = exports.updateNovedadEstado = exports.updateNovedadHora = exports.getNovedad = exports.convertNovedad = void 0;
const time_1 = require("../models/time");
const permisos_1 = require("../models/permisos");
const dayjs_1 = __importDefault(require("dayjs"));
const novedad_1 = require("../services/novedad");
const convertNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permisos = yield permisos_1.Permiso.findAll();
        const novedad = yield time_1.Novedad.findAll();
        // console.log('permisos:', permisos);
        const novedadJS = novedad.map(nv => nv.toJSON());
        const novedades = (0, novedad_1.permisoToNovedad)(permisos, novedadJS);
        console.log('Novedades:', novedades);
        const newNovedades = yield time_1.Novedad.bulkCreate(novedades);
        res.status(200).json(newNovedades);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
});
exports.convertNovedad = convertNovedad;
const getNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listaNovedades = yield time_1.Novedad.findAll({
            order: [['id', 'ASC']]
        });
        const datosConvertidos = listaNovedades.map(registro => {
            const registroConvertido = registro.toJSON();
            return Object.assign(Object.assign({}, registroConvertido), { Fecha: dayjs_1.default.utc(registroConvertido.Fecha).format('YYYY-MM-DD') });
        });
        res.json(datosConvertidos);
    }
    catch (error) {
        console.error('Error al obtener las novedades:', error);
        res.status(500).json({ error: 'Error al obtener las novedades' });
    }
});
exports.getNovedad = getNovedad;
const updateNovedadHora = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, horas } = req.body;
    try {
        if (!horas) {
            return res.status(400).json({ error: 'Falta el campo horas' });
        }
        const novedad = yield time_1.Novedad.findByPk(id);
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        yield time_1.Novedad.update({ horas }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
});
exports.updateNovedadHora = updateNovedadHora;
const updateNovedadEstado = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, aceptacion } = req.body;
    try {
        const novedad = yield time_1.Novedad.findByPk(id);
        if (!novedad) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        yield time_1.Novedad.update({ aceptacion }, { where: { id } });
        res.status(200).json({ message: 'Novedad actualizada' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Error al actualizar la novedad',
            message: error.message,
        });
    }
});
exports.updateNovedadEstado = updateNovedadEstado;
const deleteNovedad = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield time_1.Novedad.destroy({ where: {} });
        res.status(200).json({ message: 'Todas las novedades han sido eliminadas' });
    }
    catch (error) {
        console.error('Error al eliminar las novedades:', error);
        res.status(500).json({ error: 'Error al eliminar las novedades' });
    }
});
exports.deleteNovedad = deleteNovedad;
const aceptarTodo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //Obtiene en Novedad las que tengan aceptacion === null
        var novedades = yield time_1.Novedad.findAll({
            where: {
                aceptacion: null
            }
        });
        //Mapea las novedades obtenidas en formato json
        let novedadJS = novedades.map(nv => nv.toJSON());
        //Verifica que no haya ninguna novedad sin rechazar o sin aceptar
        if (novedadJS.length > 0) {
            //Se obtienen los datos para mostrar el mensaje de error
            const item = novedadJS[0];
            const fechaobj = new Date(item.Fecha);
            const soloFecha = fechaobj.toISOString().split('T')[0];
            return res.status(400).json({ error: `la novedad de ${item.Name} en la fecha ${soloFecha} no ha sido aceptada o rechazada` });
        }
        //Obtiene en Novedad las que tengan aceptacion === true
        novedades = yield time_1.Novedad.findAll({
            where: {
                aceptacion: true
            }
        });
        //Mapea las novedades obtenidas en formato json
        novedadJS = novedades.map(nv => nv.toJSON());
        // Si no existe algun registro con aceptacion === true retorna mensaje de aceptacion
        if (novedadJS.length <= 0) {
            return res.status(200).json({ message: 'Aceptado o rechazado todo' });
        }
        else { // si existe, mapeo todos los registros sacando Uid, Hora(en minutos), nombre
            const sum = novedadJS.map(nv => ({
                Uid: nv.Nid,
                hora: (0, novedad_1.convertirHora)(nv.horas),
                nombre: nv.Name
            }));
            //Si se repide el Uid se agrupa sumando los minutos
            const agrupado = {};
            sum.forEach(item => {
                if (agrupado[item.Uid]) {
                    agrupado[item.Uid] += item.hora;
                }
                else {
                    agrupado[item.Uid] = item.hora;
                }
            });
            //recorre agrupado buscando por UID
            for (const uid in agrupado) {
                //minutos acumulados en novedades
                const minutosAcumulados = agrupado[uid];
                //busca en sumatoria por id
                const sumatoria = yield time_1.Sumatoria.findOne({ where: { Sid: uid } });
                //Si existe el registro
                if (sumatoria) {
                    // asigna a actual la cantidad de horas (minutos) extras que tiene el usuario
                    const actual = (0, novedad_1.convertirHora)(sumatoria.dataValues.Acumulado);
                    // Hace la suma de tiempo extra y minutos acumulados en novedades 
                    const minutosTotales = actual + minutosAcumulados;
                    //busca por id y actualiza el acumulado (convirtiendo al formato)
                    yield time_1.Sumatoria.update({ Acumulado: (0, novedad_1.convertirMinuto)(minutosTotales) }, { where: { Sid: uid } });
                }
                else {
                    //Si el registro no existe. lo crea agregandole los datos de sum
                    yield time_1.Sumatoria.create({ Sid: uid,
                        Name: agrupado.Name,
                        Acumulado: (0, novedad_1.convertirMinuto)(minutosAcumulados) });
                }
                //Actualiza la aceptacion de la tabla novedades, poniendo en falso
                yield time_1.Novedad.update({ aceptacion: false }, { where: {
                        Nid: uid,
                    } });
            }
            // Cuando termina de recorrer retorna el mensaje de aceptacion
            return res.status(200).json({ message: 'Aceptado o rechazado todo este' });
        }
    }
    catch (error) {
        //En caso de error retorna mensaje de error
        console.error('Error al aceptar las novedades:', error);
        return res.status(500).json({ error: 'Error al aceptar las novedades' });
    }
}); /*
  1. recibir todos los datos de NOVEDADES ✔️✔️
  2. Verificar que en todos los registros aceptacion sea true o false ✔️✔️
  3. Si alguno es null debe revisar de nuevo cada registro (el usuario) ✔️✔️
  4. Si todos los registros son true o false, se obtienen solamente los registros con aceptacion true
  5. se suman las horas en la tabla SUMATORIA.
  6. se pasan todos los datos en la tabla COPIANOVEDAD
  7 se deja la tabla NOVEDAD vacia

  */
exports.aceptarTodo = aceptarTodo;
