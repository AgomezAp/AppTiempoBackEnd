"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permisoToNovedad = permisoToNovedad;
exports.defineDescuento = defineDescuento;
exports.convertirHora = convertirHora;
exports.convertirMinuto = convertirMinuto;
function permisoToNovedad(permisos, novedad) {
    const transicion = permisos.map(permiso => permiso.toJSON());
    const idsNovedades = new Set(novedad.map(nv => nv.id));
    const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
    const novedades = transicionFiltrada.map(item => {
        var _a;
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
            aceptacion: (_a = desc[0].acp) !== null && _a !== void 0 ? _a : null,
        };
    });
    return novedades;
}
function defineDescuento(tipo, entrada, salida) {
    let acp;
    let horas;
    switch (tipo) {
        case ('Permiso personal de todo el día'): {
            acp = true;
            horas = '-8:30';
            return [{ acp, horas }];
        }
        case 'Incapacidad médica':
        case 'Día de la familia':
        case 'Suspensión por proceso disciplinario':
        case 'Licencia de luto':
        case 'Media jornada por votación':
        case 'Jurado de votación':
        case 'Incapacidad laboral':
        case 'Vacaciones': {
            acp = false;
            horas = '0:00';
            return [{ acp, horas }];
        }
        case 'Calamidad':
        case 'Urgencia médica': {
            acp = null;
            horas = '0:00';
            return [{ acp, horas }];
        }
        case 'Salida Temprano': {
            acp = false;
            entrada = '17:00';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{ acp, horas, entrada }];
        }
        case 'Llegada tarde por factores externos': {
            acp = false;
            horas = '0:0';
            return [{ acp, horas }];
        }
        case 'Entrada luego de la jornada': {
            acp = false;
            salida = '7:30';
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{ acp, horas, salida }];
        }
        case 'Cita médica':
        case 'Cita odontológica': {
            acp = false;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{ acp, horas }];
        }
        case 'Permiso personal por horas': {
            acp = false;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(entradaMin - salidaMin);
            horas = `-${dif}`;
            return [{ acp, horas }];
        }
        case 'Movimiento de horario': {
            acp = false;
            horas = '0:0';
            return [{ acp, horas }];
        }
        case 'Horas extras (en casa, fuera de las instalaciones y viajes)':
        case 'Adecuacion horario': {
            acp = null;
            const entradaMin = convertirHora(entrada);
            const salidaMin = convertirHora(salida);
            const dif = convertirMinuto(salidaMin - entradaMin);
            horas = dif;
            return [{ acp, horas }];
        }
        default: {
            horas = '0:00';
            acp = null;
            return [{ acp, horas }];
        }
    }
}
function convertirHora(hora) {
    var sum = 0;
    if (!hora) {
        return 0;
    }
    const negativo = hora.startsWith('-');
    let [hh, mm] = hora.replace('-', '').split(':').map(Number);
    sum = (hh * 60) + mm;
    return negativo ? -sum : sum;
}
function convertirMinuto(hora) {
    const absHora = Math.abs(hora);
    const hh = Math.floor(absHora / 60);
    const mm = absHora % 60;
    const formataoHora = (num) => num.toString().padStart(2, '0');
    const signo = hora < 0 ? '-' : '';
    return `${signo}${formataoHora(hh)}:${formataoHora(mm)}`;
}
