-- ============================================================
-- MIGRACIÓN 008: Agregar tipo de inventario "Herramientas"
-- Base de datos: inventario_general
-- IDEMPOTENTE: usa INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

-- Insertar el tipo de inventario "herramientas" si no existe
INSERT INTO tipos_inventario (nombre, codigo, descripcion, icono, color, activo, orden, "createdAt", "updatedAt")
VALUES (
    'Herramientas',
    'herramientas',
    'Herramientas y materiales de ferretería: clavos, tornillos, taladros, llaves, alicates, martillos, brocas, cinta, etc.',
    'fa-screwdriver-wrench',
    '#795548',
    true,
    60,
    NOW(),
    NOW()
)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar el resultado
SELECT id, nombre, codigo, color, activo, orden FROM tipos_inventario ORDER BY orden;
