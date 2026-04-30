-- ============================================================
-- MIGRACIÓN 005: Agregar tipo de inventario "Desechables"
-- Base de datos: inventario_general
-- IDEMPOTENTE: usa INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

-- Insertar el tipo de inventario "desechables" si no existe
INSERT INTO tipos_inventario (nombre, codigo, descripcion, icono, color, activo, orden, "createdAt", "updatedAt")
VALUES (
    'Desechables',
    'desechables',
    'Artículos de uso único: vasos, platos, cubiertos desechables, bolsas, servilletas, guantes, tapabocas, etc.',
    'fa-trash-alt',
    '#fd7e14',
    true,
    55,
    NOW(),
    NOW()
)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar el resultado
SELECT id, nombre, codigo, color, activo, orden FROM tipos_inventario ORDER BY orden;
