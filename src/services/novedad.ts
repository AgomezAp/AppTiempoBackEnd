import { Permiso } from '../models/permisos';
import type { Novedad } from '../models/time';
export function permisoToNovedad(permisos: Permiso[], novedad: Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada: string, HoraSalida: string, description: string, horas: string, aceptacion: boolean|null}>): Array<{id: number, Nid: number, Name: string, type: string, Fecha: Date, HoraEntrada?: string|null, HoraSalida?: string|null, description: string, horas: string, aceptacion: boolean|null}> {
    const transicion = permisos.map(permiso => permiso.toJSON());
    const idsNovedades = new Set(novedad.map(nv => nv.id));
    const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
    const novedades = transicionFiltrada.map(item => {
        const desc = defineDescuento(item.tipo, item.horaEntrada, item.horaSalida);
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
    return novedades;
}


export function defineDescuento(tipo: string, entrada?: string, salida?: string): Array<{acp?: boolean | null, horas?: string, salida?: string, entrada?: string}>  {
    let acp: boolean | null;
    let horas: string;

    switch (tipo) {
        case('Permiso personal de todo el día'): {
            acp = true;
            horas = '-8:30';
            return [{acp, horas}];
        }
        case 'Incapacidad médica':
        case 'Día de la familia':
        case 'Día extralegal':
        case 'Suspensión por proceso disciplinario':
        case 'Licencia de luto':
        case 'Media jornada por votación':
        case 'Jurado de votación':    
        case 'Incapacidad laboral':
        case 'Vacaciones': {
            acp = false;
            horas = '0:00';
            return [{acp, horas}];
        }
        case 'Calamidad':
        case 'Urgencia médica': {
            acp = null;
            horas = '0:00';
            return [{acp, horas}];
        }
        case 'Salida Temprano': {
            acp = false;
            entrada = '17:00';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{acp, horas, entrada}];
        }
        case 'Llegada tarde por factores externos': {
            acp = false;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'Entrada luego de la jornada': {
            acp = false;
            salida = '7:30';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{acp, horas, salida}];
        }
        case 'Cita médica':
        case 'Cita odontológica': {
            acp = false;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{acp, horas}];
        }
        case 'Permiso personal por horas': {
            acp = false;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{acp, horas}];
        }
        case 'Movimiento de horario': {
            acp = false;
            horas = '0:0';
            return [{acp, horas}];
        }
        case 'Horas extras (en casa, fuera de las instalaciones y viajes)':
        case 'Adecuacion horario': {
            acp = null;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(salidaMin - entradaMin);
            horas = dif;
            return [{acp, horas}];
        }
        default :{
            horas = '0:00';
            acp = null
            return [{acp, horas}];

        }
    }
}


export function convertirHora(hora: string | undefined): number {
    var sum: number = 0;
    if (!hora) {
        return 0;
    }
    const [hh, mm] = hora.split(':').map(Number);
    if(hh < 0){
        sum = (hh * 60) - mm;
    } else {
        sum = (hh * 60) + mm;
    }
    
    return sum;
}

export function convertirMinuto(hora: number): string {
    const absHora = Math.abs(hora);
    const hh = Math.floor(absHora / 60);
    const mm = absHora % 60;
    const formataoHora = (num: number) => num.toString().padStart(2, '0');
    const signo = hora < 0 ? '-' : '';
    return `${signo}${formataoHora(hh)}:${formataoHora(mm)}`;
}