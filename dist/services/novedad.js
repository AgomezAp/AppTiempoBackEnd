"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineDescuento = defineDescuento;
exports.descuenta = descuenta;
exports.diferenciaHora = diferenciaHora;
function defineDescuento(tipo) {
    switch (tipo) {
        case ('Permiso personal todo el dia'): {
            descuenta('Si se descuenta NH');
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
            descuenta('No se descuenta NH');
        }
        case 'calamidad':
        case 'Urgencia medica': {
            descuenta('depende NH');
        }
        case 'salida temprano': {
            descuenta('Si se descuenta HS');
        }
        case 'llegada tarde por factores externos': {
            descuenta('No se descuenta HE');
        }
        case 'Entrada luego de la jornada': {
            descuenta('Si se descuenta HE');
        }
        case 'cita medica':
        case 'cita odontologica': {
            descuenta('depende HS y HE');
        }
        case 'movimiento de horario': {
            descuenta('No se descuenta HE y HS');
        }
        case 'Horas extras': {
            descuenta('depende HE Y HS');
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
function diferenciaHora(horaSalida, horaRegreso) {
    const hora1 = new Date(horaSalida);
    const hora2 = new Date(horaRegreso);
    const diff = Math.abs(hora2.getTime() - hora1.getTime());
    const diffHoras = Math.ceil(diff / (1000 * 60 * 60));
    return diffHoras;
}
