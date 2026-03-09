import {
    Request,
    Response,
  } from 'express';

import xpath, { XPathSelect } from 'xpath';
import {DOMParser, XMLSerializer, Document} from '@xmldom/xmldom';
import {diferenciaUpdate, formatoHora, processXML, informePersonal, informeNovedades, informeRiesgo, difereciaConMoment2, convertMinutesToTime, convertTimeToMinutes, informeNovedadNuevo} from '../services/Manejo'
import { convertirMinuto , convertirHora } from '../services/novedad'
import { Registro, Sumatoria, Novedad, NovedadHistorico, HistoricoHorasExtras} from '../models/time';
import { parseId } from '../utils/parseId';
import multer from 'multer';
import dayjs from 'dayjs';
import { Op } from 'sequelize';

declare global {
    namespace Express {
      interface Request {
        files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
      }
    }
  }

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('xml');

export const handleUploadAndConvert = async (req: Request, res: Response): Promise<any> => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al subir el archivo', details: err });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }
        try {
            const xmlContent = req.file.buffer.toString();
            const [jsonData, jsonDataExtra] = await processXML(xmlContent);
            console.log(`Cacasdac ${JSON.stringify(jsonDataExtra, null, 2)}`);
            if (!Array.isArray(jsonData) || jsonData.length === 0) {
                throw new Error('Los datos procesados no son válidos o están vacíos');
            }
            
            jsonData.forEach((record, index) => {
                if (!record.Hid || !record.Name || !record.Entrada || !record.Salida || !record.Fecha || !record.Extra) {
                    throw new Error(`Registro ${index} no tiene todos los campos requeridos`);
                }
            });
            jsonData.forEach(record => {
                record.Entrada = dayjs.tz(record.Entrada, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
                record.Salida = dayjs.tz(record.Salida, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
                record.Fecha = dayjs.tz(record.Fecha,'YYYY-MM-DD', 'America/Bogota').format('YYYY-MM-DD');
            });
            const horario = await Registro.bulkCreate(jsonData);

            // Guardar snapshot ANTES de actualizar valores
            await guardarSnapshotExtras();

            const listaExtras = await Sumatoria.findAll();
            let Extra;
            if(Object.keys(listaExtras).length === 0){
                Extra = await Sumatoria.bulkCreate(jsonDataExtra)
            } else {
                const idsExistentes = listaExtras.map(rec => rec.getDataValue('Sid'));
                const registrosFaltantes = jsonDataExtra.filter((extra: {Sid: string}) => !idsExistentes.includes(extra.Sid));
                if (registrosFaltantes.length > 0){
                    await Sumatoria.bulkCreate(registrosFaltantes, {
                        ignoreDuplicates: true
                    });
                }
                const resultado = listaExtras.map(record => ({
                    Sid: record.dataValues.Sid.toString(),
                    Name: record.dataValues.Name,
                    Acumulado: record.dataValues.Acumulado
                }));
                const resultadoActualizado = resultado.map(res => {
                    const matchingExtra = jsonDataExtra.find((extra: {Sid: string; Name: string; Acumulado: string}) => extra.Sid === res.Sid);
                    if(matchingExtra) {

                        let [horasRes, mintosRes] = res.Acumulado.split(':').map(Number);
                        if(res.Acumulado.startsWith("-")) {
                            mintosRes = -Math.abs(mintosRes)
                        }
                        let [horasExtra, mintosExtra] = matchingExtra.Acumulado.split(':').map(Number);
                        if(matchingExtra.Acumulado.startsWith("-")) {
                            mintosExtra = -Math.abs(mintosExtra)
                        }
                        const totalMinutos = (horasRes * 60) + (horasExtra * 60) + mintosRes + mintosExtra;
                        let totalHoras = totalMinutos < 0 ? Math.ceil(totalMinutos/60) : Math.floor(totalMinutos/60);
                        let mintosFinales = totalMinutos % 60
                        // if (totalHoras < 0 || mintosFinales < 0) {
                        //     totalHoras = totalHoras < 0 ? totalHoras : -totalHoras;
                        //     mintosFinales = Math.abs(mintosFinales);
                        // }
                        res.Acumulado = formatoHora({ horas: totalHoras, minutos: mintosFinales});
                        console.log(res.Acumulado, totalHoras, mintosFinales)
                        return {
                            Sid: res.Sid,
                            Name: res.Name,
                            Acumulado: res.Acumulado
                        };
                    }
                    return res;
                })
                resultadoActualizado.forEach(res => {
                    if (res.Acumulado.startsWith("--")) {
                        res.Acumulado = res.Acumulado.replace("--", "-");
                    }
                });
                for(const data of resultadoActualizado) {
                   Extra = await Sumatoria.update(
                    {Acumulado: data.Acumulado},
                    {where: { Sid: data.Sid}}
                   );
                }
            }
            return res.status(200).json({ message: 'Archivo procesado exitosamente', Extra, horario });
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            return res.status(500).json({  'Error al procesar el archivo':error });
        }
    });
};
 export const getHorario = async (req: Request, res: Response): Promise<any> => {
    try {
        const listahorario = await Registro.findAll({
          order: [['unique_key', 'ASC']]
        });
        const convertirAHorarioLocal = (fechaUTC: string | null) => {
            if (!fechaUTC) {
                return null;
            }
            return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        }
        const datosConvertidos = listahorario.map(registro => {
            const registroConvertido = registro.toJSON();
            return {
                ...registroConvertido,
                Entrada: dayjs.utc(convertirAHorarioLocal(registroConvertido.Entrada)).format('HH:mm:ss'),
                Salida: dayjs.utc(convertirAHorarioLocal(registroConvertido.Salida)).format('HH:mm:ss'),
                Fecha: dayjs.utc(registroConvertido.Fecha).format('YYYY-MM-DD'),
            };
        });
        res.json(datosConvertidos);
    } catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
        
    }
}
export const getExtra = async (req: Request, res: Response): Promise<any> => {
    try {
        const listaextra = await Sumatoria.findAll({
          order: [['Sid', 'ASC']]
        });
        // const listaExtras = await Sumatoria.findAll();
        

        res.json(listaextra);
    } catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
        
    }
}
export const getExtraById = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    try {
        const listaextra = await Sumatoria.findAll({
            where: {Sid: id},
        });
        if (!listaextra) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        res.status(200).json(listaextra);
    } catch (error) {
        console.error('Error al obtener los registros:', error);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
}
export const getHorarioById = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    const convertirAHorarioLocal = (fechaUTC: string | null) => {
        if (!fechaUTC) return null; // Manejar fechas nulas o no definidas
        return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };

    try {
        const registro = await Registro.findAll({
            where: { Hid: id },
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return {
                ...registroJSON,
                Entrada: dayjs.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
                Salida: dayjs.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
                Fecha: dayjs.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
            };
        });
        res.status(200).json(registrosConvertidos);
    } catch (error: any) {
        console.error('Error al obtener empleado por ID:', error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id}`,
            error: error.message || error,
        });
    }
};
export const getHorarioByIdFecha = async (req: Request, res: Response): Promise<any> => {
    const { id, fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC: string | null) => {
        if (!fechaUTC) return null; // Manejar fechas nulas o no definidas
        return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    }; 
    const fechaactual = dayjs.utc(typeof fecha === 'string' ? fecha : fecha[0]).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = await Registro.findOne({
            where: { Hid: id , Fecha: fechaactual},
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} en la fecha ${fecha} no encontrado`,
            });
        }
        const registroJSON = registro.toJSON(); 
        const registrosConvertidos = {
            ...registroJSON,
            Entrada: dayjs.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
            Salida: dayjs.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
            Fecha: dayjs.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
        }
        res.status(200).json(registrosConvertidos);
    } catch (error: any) {
        console.error('Error al obtener empleado por ID y Fecha:', error);
        res.status(500).json({
            message: `Error al obtener empleado con ID ${id} en la fecha ${fecha}`,
            error: error.message || error,
        });
    }
};
export const getHorarioByFecha = async (req: Request, res: Response): Promise<any> => {
    const { fecha } = req.params;
    const convertirAHorarioLocal = (fechaUTC: string | null) => {
        if (!fechaUTC) return null; // Manejar fechas nulas o no definidas
        return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    }; 
    const fechaactual = dayjs.utc(typeof fecha === 'string' ? fecha : fecha[0]).format('YYYY-MM-DDTHH:mm:ss[Z]');
    try {
        const registro = await Registro.findAll({
            where: {Fecha: fechaactual},
        });
        if (!registro) {
            return res.status(404).json({
                message: `Registros en la fecha ${fecha} no encontrado`,
            });
        }
        const registrosConvertidos = registro.map(registro => {
            const registroJSON = registro.toJSON();
            return {
                ...registroJSON,
                Entrada: dayjs.utc(convertirAHorarioLocal(registroJSON.Entrada)).format('HH:mm:ss'),
                Salida: dayjs.utc(convertirAHorarioLocal(registroJSON.Salida)).format('HH:mm:ss'),
                Fecha: dayjs.utc(registroJSON.Fecha).format('YYYY-MM-DD'), // Si quieres manejar solo la fecha
            };
        });
        res.status(200).json(registrosConvertidos);
    } catch (error: any) {
        console.error('Error al obtener registros1 por Fecha:', error);
        res.status(500).json({
            message: `Error al obtener registros en la fecha ${fecha}`,
            error: error.message || error,
        });
    }
};
export const updateSalidaById = async (req: Request, res: Response): Promise<any> => {
    const { id, fecha, salida } = req.body;
    try {
        if (!fecha || !salida) {
            return res.status(400).json({
                message: 'Fecha y hora de salida son requeridas',
            });
        }

        const salidacompleta = `${fecha} ${salida}`;
        const fechaformateada = dayjs.tz(fecha, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss.SSS utc');
        const salidaformateada = dayjs.tz(salidacompleta, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        // Buscar el registro por ID y Fecha
        const registro = await Registro.findOne({
            where: {
                Hid: id,
                Fecha: fechaformateada,
                }
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado para la fecha ${fecha}`,
            });
        }
        // Actualizar el campo Salida
        await Registro.update(
            { Salida: salidaformateada},
            {
                where: {
                    Hid: id,
                    Fecha: fechaformateada,
                },
            }
        );
        const extra = registro.getDataValue('Extra');
        var entradaactual = dayjs(registro.getDataValue('Entrada'));
        var salidaactual = dayjs(salidaformateada);
        console.log('Entrada antes:', entradaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Salida antes:', salidaactual.format('YYYY-MM-DD HH:mm:ss'));
        salidaactual = salidaactual.minute() >= 30 
            ? salidaactual.minute(30).second(0) 
            : salidaactual.minute(0).second(0);
        entradaactual = entradaactual.minute() > 30 
            ? entradaactual.add(1, 'hour').minute(0).second(0) 
            : entradaactual.minute() > 0 
            ? entradaactual.minute(30).second(0)
            : entradaactual;
        const extraactual = diferenciaUpdate(entradaactual, salidaactual, 9, 30);
        const totalActual = formatoHora(diferenciaUpdate(entradaactual, salidaactual, 0, 0))
        const extraactualformato = formatoHora(extraactual);
        console.log('Extra anterior:', extra);
        console.log('Entrada actual:', entradaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Salida actual:', salidaactual.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Extra actual:', extraactualformato);
        console.log('Total actual:', totalActual);
        await Registro.update(
            { 
                Extra: extraactualformato,
                Total: totalActual
            },
            {
                where: {
                    Hid: id,
                    Fecha: fechaformateada,
                },
            }
        );
        var sum = convertirMinuto(convertirHora(extraactualformato) - convertirHora(extra));
        const sumatoria = await Sumatoria.findOne({
            where: {
                Sid: id
            }
        }); 
        await Sumatoria.update(
            {Acumulado: convertirMinuto(convertirHora(sumatoria?.getDataValue('Acumulado')) + convertirHora(sum))},
            {
                where: {
                    Sid: id,
                }
            }
        );
        res.status(200).json({
            message: `Hora de salida del empleado con ID ${id} actualizada correctamente like`,
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Error al actualizar la hora de salida ajaj',
            details: error.message,
        });
    }
};
export const updateEntradaById = async (req: Request, res: Response): Promise<any> => {
    const { id, fecha, entrada } = req.body;
    try {
        if (!fecha || !entrada) {
            return res.status(400).json({
                message: 'Fecha y hora de salida son requeridas',
            });
        }
        const entradacompleta = `${fecha} ${entrada}`
        const fechaformateada = dayjs(fecha).format('YYYY-MM-DD HH:mm:ss.SSS utc');
        const entradaformateada = dayjs.tz(entradacompleta, 'America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        // Buscar el registro por ID y Fecha

        const registro = await Registro.findOne({
            where: {
                Hid: id,
                Fecha: fechaformateada}
        });
        if (!registro) {
            return res.status(404).json({
                message: `Empleado con ID ${id} no encontrado para la fecha ${fecha}`,
            });
        }
        // Actualizar el campo Salida
        await Registro.update(
            { Entrada: entradaformateada},
            {
                where: {
                    Hid: id,
                    Fecha: fechaformateada,
                },
            }
        );
        const extra = registro.getDataValue('Extra');
        var salidaactual = dayjs(registro.getDataValue('Salida'));
        var entradaactual = dayjs(entradaformateada);

        // Ajustar los minutos de entrada y salida
        salidaactual = salidaactual.minute() >= 30
            ? salidaactual.minute(30).second(0)
            : salidaactual.minute(0).second(0);
        entradaactual = entradaactual.minute() > 30
            ? entradaactual.add(1, 'hour').minute(0).second(0)
            : entradaactual.minute() > 0
            ? entradaactual.minute(30).second(0)
            : entradaactual;

        const extraactual = diferenciaUpdate(entradaactual, salidaactual, 9, 30);
        const totalActual = formatoHora(diferenciaUpdate(entradaactual, salidaactual, 0, 0));
        const extraactualformato = formatoHora(extraactual);
        await Registro.update(
            { 
                Extra: extraactualformato,
                Total : totalActual
            },
            {
                where: {
                    Hid: id,
                    Fecha: fechaformateada,
                },
            }
        );
        var sum = convertirMinuto(convertirHora(extraactualformato) - convertirHora(extra));
        const sumatoria = await Sumatoria.findOne({
            where: {
                Sid: id
            }
        });
        await Sumatoria.update(
            {Acumulado: convertirMinuto(convertirHora(sumatoria?.getDataValue('Acumulado')) + convertirHora(sum))},
            {
                where: {
                    Sid: id
                }
            }
        );
        res.status(200).json({
            message: `Hora de entrada del empleado con ID ${id} actualizada correctamente`,
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Error al actualizar la hora de salida ajaj',
            details: error.message,
        });
    }
};

export const agregarRegistro = async (req: Request, res: Response): Promise<any> => {
    let primero:{Fecha: string; Hid: string; Open_Time: string; Name: string;} = {Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Entrada, Name: req.body.Name};
    let segundo:{Fecha: string; Hid: string; Open_Time: string; Name: string;} = {Fecha: req.body.Fecha, Hid: req.body.Hid, Open_Time: req.body.Salida, Name: req.body.Name};
    
    const total = difereciaConMoment2(primero, segundo)
    const extH = convertMinutesToTime(convertTimeToMinutes(formatoHora(total)) - 570);
    try {
        await Registro.create({
            Hid:  req.body.Hid,
            Name:  req.body.Name,
            Entrada:  req.body.Entrada,
            Salida:  req.body.Salida,
            Fecha:  req.body.Fecha,
            Extra: extH,
            Total: formatoHora(total)
        });
        const listaExtras = await Sumatoria.findAll({ where: {Sid: req.body.Hid}});
        if(listaExtras.length === 0){
            await Sumatoria.create({
                Sid: req.body.Hid,
                Name: req.body.Name,
                Acumulado: extH
            });
        } else {
            const acum = listaExtras.map(ls => ls.toJSON() as { Acumulado: string });
            const suma = convertirMinuto(convertirHora(acum[0].Acumulado) + convertirHora(extH));
            await Sumatoria.update(
                {Extra: suma},
                {
                    where: {
                        Sid: req.body.Hid
                    },
                }
            );
        };
        res.status(200).json({
            message: `Registro agregado`,
        });
    } catch (err:any) {
        console.error("error ", err);
        res.status(500).json({
            error: "Problemas al agregar el registro",
            mesagge: err.mesagge | err,
        });    
    }
};

export const informePersonalById = async (req: Request, res: Response): Promise<any> => {
    const {id, fechaInicial, fechaFinal} = req.body;
    const convertirAHorarioLocal = (fechaUTC: string | null) => {
        if (!fechaUTC) return null; // Manejar fechas nulas o no definidas
        return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha:string) => new Date(new Date(fecha).setHours(0,0,0,0));
    try {
        const horario = await Registro.findAll({
            where: {
                Hid: {
                    [Op.in]: id
                },
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), fechaFinal],
                },
            },
            order: [
                ['Name', 'ASC']
            ]
        });
        
        if(!horario || horario.length === 0){
            res.status(404).json({message:"No se encuentran Registros."});
            return;
        }
        // const horarioPlain = horario.map(record => record.toJSON() as { ID: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string });
        const horarioPlain2 = horario.map(record => {
            const obj = record.toJSON() as {Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string};
            return {
                ...obj,
                Entrada: dayjs.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'),
                Salida: dayjs.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'),
                Fecha: dayjs.utc(obj.Fecha).format('YYYY-MM-DD'), 
            }
        });
        const pdfBuffer = await informePersonal(horarioPlain2);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=informe_personal.pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe."})
    }
};

export const informeNovedad = async (req: Request, res: Response): Promise<any> => {
    const {fechaInicial, fechaFinal} = req.body;
    const startofDay = (fecha:string) => new Date(new Date(fecha).setHours(0,0,0,0));
    try {
        const novedades = await Novedad.findAll({
            where: {
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), fechaFinal]
                }
            }
        });
        const novedadesHistorico = await NovedadHistorico.findAll({
            where: {
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), fechaFinal]
                }
            }
        });
        const todasNovedades = [...novedades, ...novedadesHistorico];
        if(!todasNovedades || todasNovedades.length === 0){
            res.status(404).json({message:"No se encuentran novedades."});
            return;
        }

        const novedadesPlain = todasNovedades.map(novedad => {
            const obj = novedad.toJSON() as {Nid: number; Name: string; type: string; description: string};
            return{...obj}
        })
        const pdfBuffer = await informeNovedades(novedadesPlain);
        res.setHeader("Content-Type", "application/pdf");
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe."})
    }
}

export const nuevaNovedad = async (req: Request, res: Response): Promise<any> => {
    const {fechaInicial, fechaFinal} = req.body;
    const startofDay = (fecha:string) => new Date(new Date(fecha).setHours(0,0,0,0));
    const endofDay = (fecha: string) => dayjs(fecha).endOf('day').toDate();

    try {
        const extras = await Sumatoria.findAll()
        const sids = extras
            .map(extra => extra.getDataValue('Sid'))
            .sort((a, b) => Number(a) - Number(b));

        const novedades = await Novedad.findAll({
            where: {
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), endofDay(fechaFinal)]
                }
            }
        });
        const novedadesHistorico = await NovedadHistorico.findAll({
            where: {
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), endofDay(fechaFinal)]
                }
            }
        });

        const todasNovedades = [...novedades, ...novedadesHistorico]
        const resultadoPlano = todasNovedades.map(nov => {
            const novObj = nov.toJSON() as { Nid?: string,  Name: string, description: string, Fecha: string}
            const extra = extras.find(e => e.getDataValue('Sid') == (novObj.Nid));
            return {
                Sid: novObj.Nid,
                Name: novObj.Name,
                Acumulado: extra ? extra.getDataValue('Acumulado') : null,
                Descripcion: novObj.description,
                Fecha: dayjs(novObj.Fecha).format('YYYY-MM-DD')
            };
        });
        const resultadoAgrupado : {
            [sid: string]: {
                Sid: string,
                Name: string,
                Acumulado: string,
                Descripciones: Array<{ Fecha: string, Descripcion: string}>
            }
        } = {}

        resultadoPlano.forEach(item => {
            if (!item.Sid) return;
            if (!resultadoAgrupado[item.Sid]) {
                resultadoAgrupado[item.Sid] = {
                    Sid: item.Sid,
                    Name: item.Name,
                    Acumulado: item.Acumulado,
                    Descripciones: []
                };
            }
            // Buscar si ya existe una descripción igual
            const existe = resultadoAgrupado[item.Sid].Descripciones.find(
                d => d.Descripcion === item.Descripcion
            );
            if (!existe) {
                resultadoAgrupado[item.Sid].Descripciones.push({
                    Fecha: item.Fecha,
                    Descripcion: item.Descripcion
                });
            } else {
                // Si ya existe, actualizar la fecha si es menor o mayor
                if (item.Fecha < existe.Fecha) {
                    existe.Fecha = item.Fecha; // Primera aparición
                } else if (item.Fecha > existe.Fecha) {
                    // Si la fecha es mayor, agregar como última aparición
                    resultadoAgrupado[item.Sid].Descripciones.push({
                        Fecha: item.Fecha,
                        Descripcion: item.Descripcion
                    });
                }
            }
            // Ordenar por fecha y dejar solo la primera y la última si hay duplicados
            resultadoAgrupado[item.Sid].Descripciones = Object.values(
                resultadoAgrupado[item.Sid].Descripciones.reduce((acc, curr) => {
                    if (!acc[curr.Descripcion]) {
                        acc[curr.Descripcion] = { first: curr, last: curr };
                    } else {
                        if (curr.Fecha < acc[curr.Descripcion].first.Fecha) {
                            acc[curr.Descripcion].first = curr;
                        }
                        if (curr.Fecha > acc[curr.Descripcion].last.Fecha) {
                            acc[curr.Descripcion].last = curr;
                        }
                    }
                    return acc;
                }, {} as Record<string, { first: { Fecha: string, Descripcion: string }, last: { Fecha: string, Descripcion: string } }>)
            ).flatMap(({ first, last }) =>
                first.Fecha === last.Fecha ? [first] : [first, last]
            ).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
        });
        const resultadoFinal = extras.map(extra => {
            const sid = extra.getDataValue('Sid');
            const acumuladoRaw = extra.getDataValue('Acumulado');
            const acumuladoFormateado = formatearAcumuladoDias(acumuladoRaw);
            if(resultadoAgrupado[sid]) {
                return {
                    ...resultadoAgrupado[sid],
                    Acumulado: acumuladoFormateado
                };
            } else {
                return {
                    Sid: sid,
                    Name: extra.getDataValue('Name'),
                    Acumulado: acumuladoFormateado,
                    Descripciones: [{
                        Fecha: "",
                        Descripcion: ""
                    }]
                };
            }
        });
        resultadoFinal.sort((a, b) => a.Name.localeCompare(b.Name));
        const pdfBuffer = await informeNovedadNuevo(resultadoFinal);
        res.setHeader("Content-Type", "application/pdf");
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error)
        res.status(500).json({message: "Error interno al generar el informe"})
    }
}

export const informePeligro = async (req: Request, res: Response): Promise<any> => {
    const {fechaInicial, fechaFinal} = req.body;
    const convertirAHorarioLocal = (fechaUTC: string | null) => {
        if (!fechaUTC) return null; // Manejar fechas nulas o no definidas
        return dayjs.utc(fechaUTC).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    };
    const startofDay = (fecha:string) => new Date(new Date(fecha).setHours(0,0,0,0));
    try {
        const horario = await Registro.findAll({
            where: {
                Fecha: {
                    [Op.between]: [startofDay(fechaInicial), fechaFinal],
                },
            },
            order: [
                ['Name', 'ASC']
            ]
        });
        
        if(!horario || horario.length === 0){
            res.status(404).json({message:"No se encuentran Registros."});
            return;
        }
        // const horarioPlain = horario.map(record => record.toJSON() as { ID: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string });
        const horarioPlain = horario.map(record => {
            const obj = record.toJSON() as {Hid: number; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string};
            return {
                ...obj,
                Entrada: dayjs.utc(convertirAHorarioLocal(obj.Entrada)).format('HH:mm:ss'),
                Salida: dayjs.utc(convertirAHorarioLocal(obj.Salida)).format('HH:mm:ss'),
                Fecha: dayjs.utc(obj.Fecha).format('YYYY-MM-DD'), 
            }
        });
        const pdfBuffer = await informeRiesgo(horarioPlain);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe."})
    }
};

export const updateExtra = async (req: Request, res: Response): Promise<any> => {
    const { id, extra } = req.body;

    try {
        if (!id || !extra) {
            return res.status(400).json({
                message: 'ID y valor de extra son requeridos',
            });
        }

        const sumatoria = await Sumatoria.findOne({
            where: { Sid: id },
        });

        if (!sumatoria) {
            return res.status(404).json({
                message: `Registro con ID ${id} no encontrado`,
            });
        }

        const extraFormateado = convertirMinuto(convertirHora(extra));

        await Sumatoria.update(
            { Acumulado: extraFormateado },
            { where: { Sid: id } }
        );

        // Guardar snapshot después de actualizar
        await guardarSnapshotExtras();

        res.status(200).json({
            message: `Valor de extra actualizado correctamente para el ID ${id}`,
        });
    } catch (error: any) {
        console.error('Error al actualizar el valor de extra:', error);
        res.status(500).json({
            error: 'Error al actualizar el valor de extra',
            details: error.message,
        });
    }
};

export const addExtra = async (req: Request, res: Response): Promise<any> => {
    const { id, extra } = req.body;

    try {
        if (!id || !extra) {
            return res.status(400).json({
                message: 'ID y valor de extra son requeridos',
            });
        }

        const sumatoria = await Sumatoria.findOne({
            where: { Sid: id },
        });

        if (!sumatoria) {
            return res.status(404).json({
                message: `Registro con ID ${id} no encontrado`,
            });
        }

        const extraFormateado = convertirMinuto(convertirHora(extra));
        const acumuladoActual = sumatoria.getDataValue('Acumulado');
        const nuevoAcumulado = convertirMinuto(convertirHora(acumuladoActual) + convertirHora(extraFormateado));

        await Sumatoria.update(
            { Acumulado: nuevoAcumulado },
            { where: { Sid: id } }
        );

        res.status(200).json({
            message: `Tiempo añadido correctamente al acumulado para el ID ${id}`,
            nuevoAcumulado,
        });
    } catch (error: any) {
        console.error('Error al añadir tiempo al acumulado:', error);
        res.status(500).json({
            error: 'Error al añadir tiempo al acumulado',
            details: error.message,
        });
    }
};

export const concatenar = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length < 1) {
        res.status(400).json({ error: 'Debe subir al menos un archivo XML' });
        return;
      }
  
      // Configurar namespaces para XPath
      const namespaces = {
        ns: "urn:schemas-microsoft-com:office:spreadsheet",
        ss: "urn:schemas-microsoft-com:office:spreadsheet"
      };
      
      const select: XPathSelect = xpath.useNamespaces(namespaces);
  
      // Procesar el primer archivo como base
      const baseXml: string = req.files[0].buffer.toString();
      const baseDoc: Document = new DOMParser().parseFromString(baseXml, 'text/xml');
      
      const baseTable: Node = select('//ns:Table', baseDoc as unknown as Node, true) as Node;
  
      if (!baseTable) {
        throw new Error('Estructura XML inválida: No se encontró la tabla');
      }
  
      // Procesar archivos adicionales
      for (let i = 1; i < req.files.length; i++) {
        const currentXml: string = req.files[i].buffer.toString();

        const currentDoc: Document = new DOMParser().parseFromString(currentXml, 'text/xml');
        
        const rows: Node[] = select('//ns:Table/ns:Row', currentDoc as unknown as Node) as Node[];
        
        if (!rows || rows.length === 0) {
          console.warn(`Archivo ${req.files[i].originalname} no contiene filas válidas`);
          continue;
        }
  
        rows.forEach((row: Node) => {
            if (row.nodeName === 'Row') { // Asegura que solo se añadan filas
              const importedRow: Node = baseDoc.importNode(row as any, true);
              baseTable.appendChild(importedRow);
            } else {
              console.warn(`Nodo ignorado: ${row.nodeName}`);
            }
          });
      }
  
      // Generar XML resultante
      const mergedXml: string = new XMLSerializer().serializeToString(baseDoc);

  
      // Configurar headers y enviar respuesta
      res.set({
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename=merged.xml'
      });
      
      res.send(mergedXml);
  
    } catch (error: unknown) {
      console.error('Error en concatenar:', error instanceof Error ? error.stack : error);
      
      const errorResponse = {
        error: 'Error al procesar los archivos',
        details: error instanceof Error ? error.message : 'Error desconocido',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined
        })
      };
  
      res.status(500).json(errorResponse);
    }
};

export const deleteRegistroByHidAndFecha = async (req: Request, res: Response): Promise<any> => {
    const { Hid, Fecha } = req.params;
  
    try {
      // Buscar el registro por Hid y Fecha
      const registro = await Registro.findOne({
        where: {
          Hid,
          Fecha: dayjs.tz(typeof Fecha === 'string' ? Fecha : Fecha[0], 'America/Bogota').format('YYYY-MM-DD HH:mm:ss.SSS utc'),
        },
      });
  
      if (!registro) {
        return res.status(404).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} no encontrado` });
      }
  
      // Eliminar el registro
      await registro.destroy();
  
      res.status(200).json({ message: `Registro con Hid ${Hid} y Fecha ${Fecha} eliminado con éxito` });
    } catch (error: any) {
      console.error('Error al eliminar el registro:', error);
      res.status(500).json({
        error: 'Error al eliminar el registro',
        details: error.message,
      });
    }
};

export const restarTiempoSabado = async (): Promise<void> => {
    try {
        const tiempoARestar = '4:00';
        const minutosARestar = convertTimeToMinutes(tiempoARestar);
        const registros = await Sumatoria.findAll();

        for (const reg of registros) {
            const acumuladoActual = reg.getDataValue('Acumulado');
            const minutosAcumulados = convertTimeToMinutes(acumuladoActual);
            const sabadoMinutos = minutosAcumulados - minutosARestar;
            const sabado = sabadoMinutos < 0 ? `${Math.ceil(sabadoMinutos/60)}:${Math.abs(sabadoMinutos % 60).toString().padStart(2, '0')}` : `${Math.floor(sabadoMinutos/60)}:${Math.abs(sabadoMinutos % 60).toString().padStart(2, '0')}`;
            await Sumatoria.update(
                { Acumulado: sabado},
                { where: { Sid: reg.getDataValue('Sid')}}
            );
        }
        console.log('Tiempo restado exitosamente')
    } catch (error: any) {
        console.error('Error al restar el tiempo:', error);
        throw error;
    }
};

function formatearAcumuladoDias(acumulado: string): string {
    // Soporta valores negativos también
    const negativo = acumulado.startsWith('-');
    const [horasStr, minutosStr] = acumulado.replace('-', '').split(':');
    const horas = parseInt(horasStr, 10) || 0;
    const minutos = parseInt(minutosStr, 10) || 0;
    let totalMin = horas * 60 + minutos;

    if (negativo) totalMin = -totalMin;

    const minutosPorDia = 8 * 60 + 30; // 8 horas y 30 minutos = 510 minutos
    const dias = Math.trunc(totalMin / minutosPorDia);
    let restoMin = Math.abs(totalMin % minutosPorDia);
    const horasRestantes = Math.trunc(restoMin / 60);
    const minutosRestantes = restoMin % 60;

    // Manejar el caso negativo
    const signo = totalMin < 0 ? '-' : '';

    return `${signo}${Math.abs(dias)} dias ${horasRestantes} horas ${minutosRestantes} minutos`;
}

// Guardar snapshot de todas las horas extras actuales (1 por usuario por día)
export const guardarSnapshotExtras = async (): Promise<void> => {
    try {
        const hoy = dayjs().format('YYYY-MM-DD');
        const registros = await Sumatoria.findAll();

        for (const reg of registros) {
            const sid = reg.getDataValue('Sid');
            const name = reg.getDataValue('Name');
            const acumulado = reg.getDataValue('Acumulado');

            const existente = await HistoricoHorasExtras.findOne({
                where: { Sid: sid, fecha: hoy }
            });

            if (existente) {
                await HistoricoHorasExtras.update(
                    { Acumulado: acumulado, Name: name },
                    { where: { Sid: sid, fecha: hoy } }
                );
            } else {
                await HistoricoHorasExtras.create({
                    Sid: sid,
                    Name: name,
                    Acumulado: acumulado,
                    fecha: hoy,
                });
            }
        }
        console.log(`Snapshot de horas extras guardado: ${hoy}`);
    } catch (error) {
        console.error('Error al guardar snapshot de horas extras:', error);
    }
};

// Obtener historial de horas extras de un usuario
export const getHistoricoExtras = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    try {
        const historico = await HistoricoHorasExtras.findAll({
            where: { Sid: id },
            order: [['fecha', 'DESC']],
            limit: 60,
        });
        res.status(200).json(historico);
    } catch (error) {
        console.error('Error al obtener historial de extras:', error);
        res.status(500).json({ error: 'Error al obtener historial de horas extras' });
    }
};

// Obtener historial de horas extras de TODOS los usuarios
export const getHistoricoExtrasAll = async (req: Request, res: Response): Promise<any> => {
    const { fecha } = req.params;
    try {
        const historico = await HistoricoHorasExtras.findAll({
            where: { fecha },
            order: [['Sid', 'ASC']],
        });
        res.status(200).json(historico);
    } catch (error) {
        console.error('Error al obtener historial de extras por fecha:', error);
        res.status(500).json({ error: 'Error al obtener historial de horas extras' });
    }
};

// Obtener detalle diario de horas extras de un usuario (filtrado por rango de fechas)
export const getDetalleExtras = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { desde, hasta } = req.query;

    try {
        if (!desde || !hasta) {
            return res.status(400).json({ error: 'Se requieren los parámetros desde y hasta' });
        }

        const registros = await Registro.findAll({
            where: {
                Hid: id,
                Fecha: {
                    [Op.gte]: new Date(desde as string + 'T00:00:00'),
                    [Op.lte]: new Date(hasta as string + 'T23:59:59'),
                },
            },
            order: [['Fecha', 'DESC']],
        });

        // Filtrar solo días con horas extras positivas (> 0:00)
        const conExtras = registros.filter((reg: any) => {
            const extra = reg.getDataValue('Extra');
            if (!extra || extra === '0:00' || extra === '0:0' || extra === '00:00') return false;
            if (extra.startsWith('-')) return false;
            return true;
        });

        res.status(200).json(conExtras);
    } catch (error) {
        console.error('Error al obtener detalle de extras:', error);
        res.status(500).json({ error: 'Error al obtener detalle de horas extras' });
    }
};