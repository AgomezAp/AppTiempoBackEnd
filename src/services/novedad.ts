import { Permiso } from '../models/permisos';
import type { Novedad } from '../models/time';
import { convertTimeToMinutes } from './Manejo';
export function permisoToNovedad(permisos: Permiso[], novedad: Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada: string, HoraSalida: string, description: string, horas: number, aceptacion: boolean|null}>): Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada: string|null, HoraSalida: string|null, description: string, horas: number, aceptacion: boolean|null}> {
    const transicion = permisos.map(permiso => permiso.toJSON());
    console.log('Transicion:', transicion);
    const idsNovedades = new Set(novedad.map(nv => nv.id));
    console.log('IdsNovedades:', idsNovedades);
    const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
    console.log('TransicionFiltrada:', transicionFiltrada);
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
            horas: desc[0].horas ? parseFloat(desc[0].horas) : 0,
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
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'calamidad':
        case 'Urgencia medica': {
            acp = null;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'salida temprano': {
            acp = true;
            entrada = '17:00';
            horas = '-(entrada - salida)';
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
            horas = '-(entrada - salida)'
            //se descuenta entre la hora de entrada y las 7:30am
            return [{acp, horas, salida}];
        }
        case 'cita medica':
        case 'cita odontologica': {
            acp = null;
            horas = '-(entrada - salida)';
            //calcular el tiempo entre la hora de entrada y de salida
            return [{acp, horas}];
        }
        case 'movimiento de horario': {
            acp = false;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'Horas extras': {
            acp = null;
            horas = 'salida - entrada';
            //calcular el tiempo entre la hora de entrada y de salida
            return [{acp, horas}];

        }
        default :{
            horas = '0:0';
            acp = null
            return [{acp, horas}];

        }
    }
}

export function descuenta(dato: string) {
    console.log(dato);
    switch (dato) {
        case 'Si se descuenta NH': {
            
        }

    }
}


export function descontando(novedad: Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada: string, HoraSalida: string, description: string, horas: number, aceptacion: boolean|null}>): Array<{Nid: number, horas: number}> {
    const descuento = novedad.filter(item => item.aceptacion === true).map(item => (
        {
            Nid: item.Nid,
            horas: item.horas,
        }
    ));
    return descuento;
}