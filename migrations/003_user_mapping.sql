-- ============================================================
-- MIGRACIÓN 003: Mapeo de usuarios inventario → horarios
-- IDEMPOTENTE: puede ejecutarse múltiples veces sin daño
-- Ejecutar conectado a: inventario_general
-- ============================================================

-- 1. Instalar extensión dblink para queries cross-database
--    (ambas BDs están en el mismo servidor PostgreSQL)
CREATE EXTENSION IF NOT EXISTS dblink;

-- 2. Crear tabla de mapeo si no existe
CREATE TABLE IF NOT EXISTS user_mapping (
    inventario_uid  INTEGER NOT NULL,
    horarios_uid    INTEGER NOT NULL,
    metodo_mapeo    VARCHAR(30) DEFAULT 'correo',
    -- Cómo se encontró la correspondencia: 'correo', 'nombre', 'cedula', 'manual'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (inventario_uid),
    UNIQUE (horarios_uid)
);

-- ============================================================
-- INSTRUCCIONES: Reemplazar PASSWORD_AQUI con la contraseña real
-- antes de ejecutar los INSERT siguientes
-- ============================================================

-- 3. Cruce por correo electrónico (método más confiable)
-- Conecta a api_inventario vía dblink y cruza por email/correo
INSERT INTO user_mapping (inventario_uid, horarios_uid, metodo_mapeo)
SELECT
    inv."Uid"       AS inventario_uid,
    hor."Uid"       AS horarios_uid,
    'correo'        AS metodo_mapeo
FROM
    users inv
    JOIN dblink(
        'host=185.137.92.54 port=5432 dbname=api_inventario user=alejandroap password=PASSWORD_AQUI',
        'SELECT "Uid", email FROM users WHERE status = 1'
    ) AS hor("Uid" INTEGER, email VARCHAR)
        ON LOWER(TRIM(inv.correo)) = LOWER(TRIM(hor.email))
WHERE NOT EXISTS (
    SELECT 1 FROM user_mapping um
    WHERE um.inventario_uid = inv."Uid"
)
ON CONFLICT DO NOTHING;

-- 4. Cruce por nombre + apellido (fallback para quienes no cruzaron por correo)
INSERT INTO user_mapping (inventario_uid, horarios_uid, metodo_mapeo)
SELECT
    inv."Uid"       AS inventario_uid,
    hor."Uid"       AS horarios_uid,
    'nombre'        AS metodo_mapeo
FROM
    users inv
    JOIN dblink(
        'host=185.137.92.54 port=5432 dbname=api_inventario user=alejandroap password=PASSWORD_AQUI',
        'SELECT "Uid", name, "lastName" FROM users WHERE status = 1'
    ) AS hor("Uid" INTEGER, name VARCHAR, "lastName" VARCHAR)
        ON LOWER(TRIM(inv.nombre)) = LOWER(TRIM(hor.name))
       AND LOWER(TRIM(inv.apellido)) = LOWER(TRIM(hor."lastName"))
WHERE NOT EXISTS (
    SELECT 1 FROM user_mapping um
    WHERE um.inventario_uid = inv."Uid"
)
ON CONFLICT DO NOTHING;

-- 5. Cruce por cédula: cedulaReceptor de actas_entrega vs documentoIdentificacion en horarios
-- Útil para usuarios que crearon actas pero no tienen cuenta en inventario.users
INSERT INTO user_mapping (inventario_uid, horarios_uid, metodo_mapeo)
SELECT DISTINCT
    inv."Uid"       AS inventario_uid,
    hor."Uid"       AS horarios_uid,
    'cedula'        AS metodo_mapeo
FROM
    users inv
    JOIN actas_entrega ae ON ae."Uid" = inv."Uid"
    JOIN dblink(
        'host=185.137.92.54 port=5432 dbname=api_inventario user=alejandroap password=PASSWORD_AQUI',
        'SELECT "Uid", "documentoIdentificacion" FROM users WHERE status = 1 AND "documentoIdentificacion" IS NOT NULL'
    ) AS hor("Uid" INTEGER, "documentoIdentificacion" VARCHAR)
        ON TRIM(ae."cedulaReceptor") = TRIM(hor."documentoIdentificacion")
WHERE NOT EXISTS (
    SELECT 1 FROM user_mapping um
    WHERE um.inventario_uid = inv."Uid"
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- REPORTE: usuarios que NO pudieron mapearse automáticamente
-- (requieren mapeo manual)
-- ============================================================
SELECT
    u."Uid"     AS inventario_uid,
    u.nombre,
    u.apellido,
    u.correo,
    'SIN MAPEAR - requiere revisión manual' AS estado
FROM users u
LEFT JOIN user_mapping um ON u."Uid" = um.inventario_uid
WHERE um.inventario_uid IS NULL
ORDER BY u.nombre;

-- ============================================================
-- PARA MAPEO MANUAL: usar este INSERT
-- ============================================================
-- INSERT INTO user_mapping (inventario_uid, horarios_uid, metodo_mapeo)
-- VALUES (ID_INVENTARIO, ID_HORARIOS, 'manual')
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- RESUMEN DE RESULTADOS
-- ============================================================
SELECT
    COUNT(*) FILTER (WHERE metodo_mapeo = 'correo') AS mapeados_por_correo,
    COUNT(*) FILTER (WHERE metodo_mapeo = 'nombre') AS mapeados_por_nombre,
    COUNT(*) FILTER (WHERE metodo_mapeo = 'cedula') AS mapeados_por_cedula,
    COUNT(*) FILTER (WHERE metodo_mapeo = 'manual') AS mapeados_manualmente,
    COUNT(*) AS total_mapeados
FROM user_mapping;

SELECT 'Migración 003 completada' AS resultado;
