-- ============================================================
-- MIGRACIÓN 009: Eliminar FK de Uid a users en tablas del inventario_general
-- 
-- Problema: las tablas del módulo inventario tienen constraints de FK
-- que apuntan a la tabla "users", pero la base de datos inventario_general
-- es independiente y no contiene todos los usuarios del sistema principal.
-- El campo Uid es solo de referencia para auditoría (quién creó/modificó),
-- no necesita integridad referencial.
--
-- Ejecutar conectado a: inventario_general
-- ============================================================

-- Tabla: dispositivos
ALTER TABLE dispositivos
    DROP CONSTRAINT IF EXISTS "dispositivos_Uid_fkey";

-- Tabla: actas_entrega (por si también tiene la misma constraint)
ALTER TABLE actas_entrega
    DROP CONSTRAINT IF EXISTS "actas_entrega_Uid_fkey";

-- Tabla: movimientos_dispositivo (por si también tiene la misma constraint)
ALTER TABLE movimientos_dispositivo
    DROP CONSTRAINT IF EXISTS "movimientos_dispositivo_Uid_fkey";

-- Tabla: detalles_acta (por si también tiene la misma constraint)
ALTER TABLE detalles_acta
    DROP CONSTRAINT IF EXISTS "detalles_acta_Uid_fkey";

-- Tabla: actas_devolucion (por si también tiene la misma constraint)
ALTER TABLE actas_devolucion
    DROP CONSTRAINT IF EXISTS "actas_devolucion_Uid_fkey";
