/**
 * Festivos Colombia — Cálculo automático de días festivos colombianos.
 * Soporta festivos fijos, Ley Emiliani y festivos basados en Pascua.
 */

/** Algoritmo Gregoriano Anónimo para calcular el Domingo de Pascua */
function getEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/** Si la fecha ya es lunes la retorna; si no, retorna el siguiente lunes */
function nextMonday(date: Date): Date {
    const d = new Date(date);
    const dow = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    if (dow === 1) return d;
    const daysToAdd = dow === 0 ? 1 : 8 - dow;
    d.setDate(d.getDate() + daysToAdd);
    return d;
}

function toYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getFestivosYear(year: number): Set<string> {
    const s = new Set<string>();
    const add = (d: Date) => s.add(toYMD(d));
    const fixed = (m: number, d: number) => add(new Date(year, m - 1, d));
    // Ley Emiliani: si no es lunes, se traslada al siguiente lunes
    const emiliani = (m: number, d: number) => add(nextMonday(new Date(year, m - 1, d)));

    // Festivos fijos
    fixed(1, 1);    // Año Nuevo
    fixed(5, 1);    // Día del Trabajo
    fixed(7, 20);   // Independencia de Colombia
    fixed(8, 7);    // Batalla de Boyacá
    fixed(12, 8);   // Inmaculada Concepción
    fixed(12, 25);  // Navidad

    // Festivos Ley Emiliani (trasladados al siguiente lunes)
    emiliani(1, 6);    // Reyes Magos
    emiliani(3, 19);   // San José
    emiliani(6, 29);   // San Pedro y San Pablo
    emiliani(8, 15);   // Asunción de la Virgen
    emiliani(10, 12);  // Día de la Raza
    emiliani(11, 1);   // Todos los Santos
    emiliani(11, 11);  // Independencia de Cartagena

    // Festivos basados en Pascua
    const easter = getEaster(year);
    add(addDays(easter, -3));                   // Jueves Santo
    add(addDays(easter, -2));                   // Viernes Santo
    add(nextMonday(addDays(easter, 39)));        // Ascensión del Señor
    add(nextMonday(addDays(easter, 60)));        // Corpus Christi
    add(nextMonday(addDays(easter, 68)));        // Sagrado Corazón de Jesús

    return s;
}

// Cache de festivos precalculados
const FESTIVOS_CACHE: Map<number, Set<string>> = new Map();

/**
 * Retorna true si la fecha dada (formato YYYY-MM-DD) es festivo en Colombia.
 * Calcula y cachea los festivos por año automáticamente.
 */
export function esFestivoColombiano(fecha: string): boolean {
    const year = parseInt(fecha.slice(0, 4), 10);
    if (!FESTIVOS_CACHE.has(year)) {
        FESTIVOS_CACHE.set(year, getFestivosYear(year));
    }
    return FESTIVOS_CACHE.get(year)!.has(fecha);
}
