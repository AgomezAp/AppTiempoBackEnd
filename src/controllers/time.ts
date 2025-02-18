import {
    Request,
    Response,
  } from 'express';

import {diferenciaUpdate, formatoHora, processXML, informePersonal, informeNovedades, informeRiesgo, difereciaConMoment2, convertMinutesToTime, convertTimeToMinutes} from '../services/Manejo'
import { convertirMinuto , convertirHora } from '../services/novedad'
import { Registro, Sumatoria, Novedad} from '../models/time';
import multer from 'multer';
import { parseStringPromise } from 'xml2js';
import dayjs from 'dayjs';
import { Op, json, literal, where } from 'sequelize';
import e from 'cors';
import { resolveContent } from 'nodemailer/lib/shared';
import { format } from 'mysql2';
import { xmppPreKey } from '@adiwajshing/baileys';



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
            const listaExtras = await Sumatoria.findAll();
            let Extra;
            if(Object.keys(listaExtras).length === 0){
                Extra = await Sumatoria.bulkCreate(jsonDataExtra)
            } else {
                const resultado = listaExtras.map(record => ({
                    Sid: record.dataValues.Sid.toString(),
                    Name: record.dataValues.Name,
                    Acumulado: record.dataValues.Acumulado
                }));
                const resultadoActualizado = resultado.map(res => {
                    const matchingExtra = jsonDataExtra.find((extra: {Sid: string; Name: string; Acumulado: string}) => extra.Sid === res.Sid);
                    if(matchingExtra) {

                        const [horasRes, mintosRes] = res.Acumulado.split(':').map(Number);
                        const [horasExtra, mintosExtra] = matchingExtra.Acumulado.split(':').map(Number);
                        const totalMinutos = mintosRes + mintosExtra;
                        const totalHoras = horasRes + horasExtra + Math.floor(totalMinutos / 60);
                        const mintosFinales = totalMinutos % 60;
    
                        res.Acumulado = formatoHora({ horas: totalHoras, minutos: mintosFinales});
                        return {
                            Sid: res.Sid,
                            Name: res.Name,
                            Acumulado: res.Acumulado
                        };
                    }
                    return res;
                })
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
        console.log(listahorario)
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
    const { Sid } = req.params;
    try {
        const listaextra = await Sumatoria.findAll({
            where: {Sid: Sid},
        });
        if (!listaextra) {
            return res.status(404).json({
                message: `Empleado con ID ${Sid} no encontrado`,
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
    const fechaactual = dayjs.utc(fecha).format('YYYY-MM-DDTHH:mm:ss[Z]');
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
    const fechaactual = dayjs.utc(fecha).format('YYYY-MM-DDTHH:mm:ss[Z]');
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
        const extraactual = diferenciaUpdate(entradaactual, salidaactual, 9, 30);
        const totalActual = formatoHora(diferenciaUpdate(entradaactual, salidaactual, 0, 0))
        const extraactualformato = formatoHora(extraactual);
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
        const extraactual = diferenciaUpdate(entradaactual, salidaactual, 9, 30);
        const totalActual = formatoHora(diferenciaUpdate(entradaactual,salidaactual,0,0))
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
    console.log(formatoHora(total))
    console.log(extH)
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
        console.log("llegamos2");
        
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
        console.log("llegamos3");
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
        if(!novedades || novedades.length === 0){
            res.status(404).json({message:"No se encuentran novedades."});
            return;
        }

        const novedadesPlain = novedades.map(novedad => {
            const obj = novedad.toJSON() as {Nid: number; Name: string; type: string; description: string};
            return{...obj}
        })
        console.log(novedadesPlain)
        const pdfBuffer = await informeNovedades(novedadesPlain);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe."})
    }
}

export const informePeligro = async (req: Request, res: Response): Promise<any> => {
    const {fechaInicial, fechaFinal} = req.body;
    console.log("llegamos1");
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
        console.log("llegamos2");
        
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
        console.log("llegamos3");
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error al generar el informe", error);
        res.status(500).json({ message: "Error interno al generar el informe."})
    }
};