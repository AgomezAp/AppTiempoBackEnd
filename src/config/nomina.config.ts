/**
 * CONFIGURACIÓN DE NÓMINA - COLOMBIA
 * 
 * Este archivo contiene los valores que cambian anualmente según la normativa colombiana.
 * IMPORTANTE: Actualizar estos valores cada año cuando el gobierno decrete los nuevos montos.
 * 
 * Última actualización: 2025
 */

export const NominaConfig = {
  /**
   * SALARIO MÍNIMO LEGAL MENSUAL VIGENTE (SMLMV)
   * Año 2025: $1.423.500
   * 
   * ACTUALIZAR CADA AÑO cuando el gobierno decrete el nuevo salario mínimo
   */
  SALARIO_MINIMO: 1423500,

  /**
   * AUXILIO DE TRANSPORTE
   * Año 2025: $200.000 (valor aproximado)
   * 
   * ACTUALIZAR CADA AÑO cuando el gobierno decrete el nuevo auxilio de transporte
   * 
   * REGLA: Solo aplica cuando el trabajador gana MENOS de 2 salarios mínimos
   */
  AUXILIO_TRANSPORTE: 200000,

  /**
   * PORCENTAJES DE DEDUCCIONES
   * Estos valores son relativamente estables, pero verificar anualmente
   */
  PORCENTAJE_SALUD: 0.04,      // 4% - Aporte del trabajador
  PORCENTAJE_PENSION: 0.04,    // 4% - Aporte del trabajador

  /**
   * CÁLCULO DE VACACIONES
   * 15 días hábiles por año = equivalente a medio mes (30/2)
   * Aquí usamos 6 días como ejemplo para el desprendible
   */
  DIAS_VACACIONES_DESPRENDIBLE: 6,

  /**
   * LÍMITE PARA AUXILIO DE TRANSPORTE
   * Multiplicador del salario mínimo
   */
  MULTIPLICADOR_AUXILIO: 2,  // Auxilio aplica si salario < 2 * SALARIO_MINIMO

  /**
   * Métodos de ayuda
   */
  aplicaAuxilioTransporte(salario: number): boolean {
    return salario < (this.SALARIO_MINIMO * this.MULTIPLICADOR_AUXILIO);
  },

  calcularAuxilioTransporte(salario: number): number {
    return this.aplicaAuxilioTransporte(salario) ? this.AUXILIO_TRANSPORTE : 0;
  },

  calcularSalud(salario: number): number {
    return Math.round(salario * this.PORCENTAJE_SALUD);
  },

  calcularPension(salario: number): number {
    return Math.round(salario * this.PORCENTAJE_PENSION);
  },

  calcularVacaciones(salario: number): number {
    return Math.round(salario / 5); // 6 días de vacaciones
  }
};

/**
 * HISTORIAL DE CAMBIOS:
 * 
 * 2025:
 * - Salario Mínimo: $1.423.500
 * - Auxilio de Transporte: $200.000
 * 
 * 2024:
 * - Salario Mínimo: $1.300.000
 * - Auxilio de Transporte: $162.000
 * 
 * INSTRUCCIONES PARA ACTUALIZAR:
 * 1. Cambiar los valores de SALARIO_MINIMO y AUXILIO_TRANSPORTE
 * 2. Actualizar la fecha de "Última actualización" arriba
 * 3. Agregar los nuevos valores al historial
 * 4. Guardar el archivo
 * 5. Reiniciar el servidor backend
 */
