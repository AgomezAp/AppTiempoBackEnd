"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permisoToNovedad = permisoToNovedad;
exports.defineDescuento = defineDescuento;
exports.descuenta = descuenta;
exports.descontando = descontando;
function permisoToNovedad(permisos, novedad) {
    const transicion = permisos.map(permiso => permiso.toJSON());
    console.log('Transicion:', transicion);
    const idsNovedades = new Set(novedad.map(nv => nv.id));
    console.log('IdsNovedades:', idsNovedades);
    const transicionFiltrada = transicion.filter(permiso => !idsNovedades.has(permiso.id));
    console.log('TransicionFiltrada:', transicionFiltrada);
    const novedades = transicionFiltrada.map(item => {
        var _a;
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
            aceptacion: (_a = desc[0].acp) !== null && _a !== void 0 ? _a : null,
        };
    });
    console.log('Novedades:', novedades);
    return novedades;
}
function defineDescuento(tipo, entrada, salida) {
    let acp;
    let horas;
    switch (tipo) {
        case ('Permiso personal todo el dia'): {
            acp = true;
            horas = '-8:30';
            return [{ acp, horas }];
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
            return [{ acp, horas }];
        }
        case 'calamidad':
        case 'Urgencia medica': {
            acp = null;
            horas = '0:0';
            return [{ acp, horas }];
        }
        case 'salida temprano': {
            acp = true;
            entrada = '17:00';
            horas = '-(entrada - salida)';
            //calcular el tiempo entre las 5pm y la hora de salida
            return [{ acp, horas, entrada }];
        }
        case 'llegada tarde por factores externos': {
            acp = false;
            horas = '0:0';
            return [{ acp, horas }];
        }
        case 'Entrada luego de la jornada': {
            acp = true;
            salida = '7:30';
            horas = '-(entrada - salida)';
            //se descuenta entre la hora de entrada y las 7:30am
            return [{ acp, horas, salida }];
        }
        case 'cita medica':
        case 'cita odontologica': {
            acp = null;
            horas = '-(entrada - salida)';
            //calcular el tiempo entre la hora de entrada y de salida
            return [{ acp, horas }];
        }
        case 'movimiento de horario': {
            acp = false;
            horas = '0:0';
            return [{ acp, horas }];
        }
        case 'Horas extras': {
            acp = null;
            horas = 'salida - entrada';
            //calcular el tiempo entre la hora de entrada y de salida
            return [{ acp, horas }];
        }
        default: {
            horas = '0:0';
            acp = null;
            return [{ acp, horas }];
        }
    }
}
function descuenta(dato) {
    console.log(dato);
    switch (dato) {
        case 'Si se descuenta NH': {
        }
    }
}
function descontando(novedad) {
    const descuento = novedad.filter(item => item.aceptacion === true).map(item => ({
        Nid: item.Nid,
        horas: item.horas,
    }));
    return descuento;
}
