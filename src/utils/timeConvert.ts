// Canonical time conversion utilities — imported by novedad.ts and Manejo.ts

export function convertirHora(hora: string | undefined): number {
    if (!hora) return 0;
    const negativo = hora.startsWith('-');
    const [hh, mm] = hora.replace('-', '').split(':').map(Number);
    return negativo ? -((hh * 60) + mm) : (hh * 60) + mm;
}

export function convertirMinuto(hora: number): string {
    const absHora = Math.abs(hora);
    const hh = Math.floor(absHora / 60);
    const mm = absHora % 60;
    const fmt = (n: number) => n.toString().padStart(2, '0');
    return `${hora < 0 ? '-' : ''}${fmt(hh)}:${fmt(mm)}`;
}

export function convertTimeToMinutes(time: string): number {
    if (!time || !time.includes(':')) return NaN;
    const isNegative = time.startsWith('-');
    const parts = time.replace('-', '').split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return NaN;
    return isNegative ? -(hours * 60 + minutes) : hours * 60 + minutes;
}

export function convertMinutesToTime(minutes: number): string {
    const horas = minutes < 0 ? -Math.floor(Math.abs(minutes) / 60) : Math.floor(minutes / 60);
    const minutos = minutes % 60;
    const isNegative = horas < 0 || (horas === 0 && minutos < 0);
    const absHoras = Math.abs(horas);
    const absMinutos = Math.abs(minutos);
    return `${isNegative ? '-' : ''}${absHoras}:${absMinutos.toString().padStart(2, '0')}`;
}
