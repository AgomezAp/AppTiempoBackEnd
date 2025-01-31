import { Permiso } from '../models/permisos';
import type { Novedad } from '../models/time';
import { convertTimeToMinutes } from './Manejo';
export function permisoToNovedad(permisos: Permiso[], novedad: Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada: string, HoraSalida: string, description: string, horas: string, aceptacion: boolean|null}>): Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada?: string|null, HoraSalida?: string|null, description: string, horas: string, aceptacion: boolean|null}> {
    const transicion = permisos.map(permiso => permiso.toJSON());
    const idsNovedades = new Set(novedad.map(nv => nv.id));
    const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
    const novedades = transicionFiltrada.map(item => {

        const desc = defineDescuento(item.tipo, item.horaEntrada, item.horaSalida);
        // const horas = convertTimeToMinutes(item.horaSalida);
        // console.log('Horas:', horas, 'tipo', typeof(horas));
        // console.log('Horas:', item.horaSalida, 'tipo', typeof(item.horaSalida));
        return {
            id: item.id,
            Nid: item.Uid,
            Name: item.nombre,
            type: item.tipo,
            Fecha: item.fecha,
            HoraEntrada: desc[0].entrada || item.horaEntrada,
            HoraSalida: desc[0].salida || item.horaSalida,
            description: item.observaciones,
            horas: desc[0].horas || '0:00',
            aceptacion: desc[0].acp ?? null,
        };
        });
    console.log('Novedades:', novedades);
    return novedades;
}


export function defineDescuento(tipo: string, entrada?: string, salida?: string): Array<{acp?: boolean | null, horas?: string, salida?: string, entrada?: string}>  {
    let acp: boolean | null;
    let horas: string;

    switch (tipo) {
        case('Permiso personal todo el dia'): {
            acp = true;
            horas = '-8:30';
            return [{acp, horas}];
        }
        case 'Incapacidad médica':
        case 'Día de la familia':
        case 'Día extralegal':
        case 'Suspension por proceso disciplinario':
        case 'Licencia de luto':
        case 'media jornada por votación':
        case 'Jurado de votacion':    
        case 'Incapacidad laboral':
        case 'Vacaciones': {
            acp = false;
            horas = '0:00';
            return [{acp, horas}];
        }
        case 'calamidad':
        case 'Urgencia medica': {
            acp = null;
            horas = '0:00';
            return [{acp, horas}];
        }
        case 'Salida Temprano': {
            acp = true;
            entrada = '17:00';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            console.log('Entrada:', entradaMin, 'Salida:', salidaMin);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            //calcular el tiempo entre las 5pm y la hora de salida
            return [{acp, horas, entrada}];
        }
        case 'llegada tarde por factores externos': {
            acp = false;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'Entrada luego de la jornada': {
            acp = true;
            salida = '7:30';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            //se descuenta entre la hora de entrada y las 7:30am
            return [{acp, horas, salida}];
        }
        case 'cita medica':
        case 'Cita odontológica': {
            acp = null;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            //calcular el tiempo entre la hora de entrada y de salida
            return [{acp, horas}];
        }
        case 'movimiento de horario': {
            acp = false;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'Horas extras (en casa, fuera de las instalaciones y viajes)': {
            acp = null;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(salidaMin - entradaMin);
            horas = dif;
            //calcular el tiempo entre la hora de entrada y de salida
            return [{acp, horas}];

        }
        default :{
            horas = '0:00';
            acp = null
            return [{acp, horas}];

        }
    }
}


function convertirHora(hora: string | undefined): number {
    if (!hora) {
        return 0;
    }
    const [hh, mm] = hora.split(':').map(Number);      
    const sum = (hh * 60) + mm;
    return sum;
}

function convertirMinuto(hora: number): string {
    const hh = Math.floor(hora / 60);
    let mm = hora % 60;
    const formataoHora = (num: number) => num.toString().padStart(2, '0');
    return `${formataoHora(hh)}:${formataoHora(mm)}`;
}