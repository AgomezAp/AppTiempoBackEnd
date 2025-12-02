# 📋 Configuración de Nómina

Este directorio contiene la configuración centralizada de valores de nómina que cambian anualmente según la normativa colombiana.

## 📁 Archivos

### `nomina.config.ts`
Archivo principal de configuración que contiene:
- **Salario Mínimo Legal Mensual Vigente (SMLMV)**
- **Auxilio de Transporte**
- **Porcentajes de deducciones** (Salud, Pensión)
- **Métodos de cálculo** automáticos

## 🔄 Actualización Anual

### ¿Cuándo actualizar?

Actualizar estos valores **CADA AÑO** cuando el gobierno colombiano decrete los nuevos montos, generalmente a finales de diciembre o principios de enero.

### ¿Cómo actualizar?

1. **Abrir el archivo**: `src/config/nomina.config.ts`

2. **Buscar la sección de constantes**:
   ```typescript
   SALARIO_MINIMO: 1423500,        // ⬅️ CAMBIAR ESTE VALOR
   AUXILIO_TRANSPORTE: 200000,     // ⬅️ CAMBIAR ESTE VALOR
   ```

3. **Actualizar los valores** con los nuevos montos decretados

4. **Actualizar la fecha** en el comentario "Última actualización"

5. **Agregar al historial** los nuevos valores en la sección de "HISTORIAL DE CAMBIOS"

6. **Guardar el archivo**

7. **Reiniciar el servidor backend** para que los cambios surtan efecto

### Ejemplo de actualización para 2026:

```typescript
// Cambiar de:
SALARIO_MINIMO: 1423500,
AUXILIO_TRANSPORTE: 200000,

// A los nuevos valores de 2026 (ejemplo):
SALARIO_MINIMO: 1500000,        // Nuevo salario mínimo 2026
AUXILIO_TRANSPORTE: 215000,     // Nuevo auxilio 2026
```

Y agregar al historial:
```typescript
/**
 * HISTORIAL DE CAMBIOS:
 * 
 * 2026:  ⬅️ AGREGAR NUEVA ENTRADA
 * - Salario Mínimo: $1.500.000
 * - Auxilio de Transporte: $215.000
 * 
 * 2025:
 * - Salario Mínimo: $1.423.500
 * - Auxilio de Transporte: $200.000
 * ...
 */
```

## ⚠️ IMPORTANTE

- **NO cambiar** los métodos de cálculo a menos que cambie la normativa
- **NO modificar** los porcentajes de Salud (4%) y Pensión (4%) a menos que la ley cambie
- **Verificar** que el multiplicador del auxilio de transporte siga siendo 2 (actualmente aplica si salario < 2 mínimos)

## 🎯 Archivos que usan esta configuración

- `src/controllers/certificado.ts` - Generación de desprendibles de pago
- Cualquier otro archivo que importe `NominaConfig`

## 📞 Soporte

Si tienes dudas sobre los valores a actualizar, consulta:
- **Ministerio del Trabajo**: [mintrabajo.gov.co](https://www.mintrabajo.gov.co)
- **Decretos presidenciales** publicados cada año
- **Equipo de RRHH** de la empresa

---

**Última revisión**: Enero 2025
