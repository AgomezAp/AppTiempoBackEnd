-- ============================================================
-- Migration 004: Tablas para el expediente del colaborador
-- Documentos adjuntos y notas de admin sobre el colaborador
-- ============================================================

-- Tabla: documentos_expediente
-- Almacena archivos que el admin adjunta al expediente de un colaborador
CREATE TABLE IF NOT EXISTS documentos_expediente (
    id              SERIAL PRIMARY KEY,
    "Uid"           INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    nombre          VARCHAR(300) NOT NULL,
    descripcion     TEXT,
    ruta            VARCHAR(500) NOT NULL,
    tipo_archivo    VARCHAR(50),
    admin_nombre    VARCHAR(200),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_expediente_uid ON documentos_expediente("Uid");

-- Tabla: notas_expediente
-- Notas libres que los administradores/RRHH pueden agregar al expediente de un colaborador
CREATE TABLE IF NOT EXISTS notas_expediente (
    id              SERIAL PRIMARY KEY,
    "Uid"           INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    nota            TEXT NOT NULL,
    admin_nombre    VARCHAR(200),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_expediente_uid ON notas_expediente("Uid");
