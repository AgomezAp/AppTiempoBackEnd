-- ============================================================
-- MIGRACIÓN 002: Nuevas tablas en api_inventario
-- Módulos: Contratos, Hoja de Vida, Evaluaciones de Desempeño
-- IDEMPOTENTE: usa CREATE TABLE IF NOT EXISTS
-- Ejecutar conectado a: api_inventario
-- ============================================================

-- ============================================================
-- MÓDULO CONTRATOS
-- ============================================================

CREATE TABLE IF NOT EXISTS contratos (
    id                  SERIAL PRIMARY KEY,
    "Uid"               INTEGER NOT NULL REFERENCES users("Uid") ON DELETE RESTRICT,
    tipo_contrato       VARCHAR(50) NOT NULL,
    -- Valores: 'termino-indefinido', 'termino-fijo', 'prestacion-servicios',
    --          'aprendizaje', 'obra-labor'
    numero_contrato     VARCHAR(50),
    fecha_inicio        DATE NOT NULL,
    fecha_fin           DATE,
    -- NULL si es a término indefinido
    salario             NUMERIC(15,2) NOT NULL,
    cargo               VARCHAR(200) NOT NULL,
    empresa             VARCHAR(10) NOT NULL,
    -- Valores: 'AP', 'AT', 'ME' (igual que enum_users_empresa)
    area                VARCHAR(200),
    jornada             VARCHAR(50),
    -- Valores: 'tiempo-completo', 'medio-tiempo', 'horas'
    lugar_trabajo       VARCHAR(200),
    periodo_prueba_dias INTEGER DEFAULT 0,
    estado              VARCHAR(20) DEFAULT 'activo',
    -- Valores: 'activo', 'terminado', 'suspendido', 'renovado'
    observaciones       TEXT,
    documento_url       VARCHAR(500),
    -- URL al PDF del contrato (en carpeta uploads/)
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_uid ON contratos("Uid");
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON contratos(empresa);

CREATE TABLE IF NOT EXISTS contratos_modificaciones (
    id                  SERIAL PRIMARY KEY,
    contrato_id         INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tipo_modificacion   VARCHAR(50) NOT NULL,
    -- Valores: 'otroSi', 'suspension', 'reactivacion', 'terminacion',
    --          'cambio_salario', 'cambio_cargo', 'prorroga'
    fecha_efectiva      DATE NOT NULL,
    descripcion         TEXT NOT NULL,
    nuevo_salario       NUMERIC(15,2),
    nuevo_cargo         VARCHAR(200),
    nueva_fecha_fin     DATE,
    documento_url       VARCHAR(500),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_mod_contrato ON contratos_modificaciones(contrato_id);

-- ============================================================
-- MÓDULO HOJA DE VIDA
-- ============================================================

CREATE TABLE IF NOT EXISTS experiencia_laboral (
    id              SERIAL PRIMARY KEY,
    "Uid"           INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    empresa         VARCHAR(200) NOT NULL,
    cargo           VARCHAR(200) NOT NULL,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE,
    -- NULL si es el trabajo actual
    descripcion     TEXT,
    telefono        VARCHAR(20),
    -- Teléfono de referencia laboral
    jefe_inmediato  VARCHAR(200),
    motivo_retiro   VARCHAR(300),
    activo          BOOLEAN DEFAULT FALSE,
    -- TRUE si es el empleo actual
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiencia_uid ON experiencia_laboral("Uid");

CREATE TABLE IF NOT EXISTS formacion_academica (
    id              SERIAL PRIMARY KEY,
    "Uid"           INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    nivel           VARCHAR(50) NOT NULL,
    -- Valores: 'primaria', 'bachillerato', 'tecnico', 'tecnologo',
    --          'universitario', 'especializacion', 'maestria', 'doctorado'
    institucion     VARCHAR(200) NOT NULL,
    titulo          VARCHAR(300),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    graduado        BOOLEAN DEFAULT FALSE,
    numero_tarjeta  VARCHAR(100),
    -- Número de tarjeta profesional si aplica
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formacion_uid ON formacion_academica("Uid");

CREATE TABLE IF NOT EXISTS habilidades (
    id          SERIAL PRIMARY KEY,
    "Uid"       INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    habilidad   VARCHAR(200) NOT NULL,
    nivel       VARCHAR(20),
    -- Valores: 'basico', 'intermedio', 'avanzado', 'experto'
    tipo        VARCHAR(50),
    -- Valores: 'tecnica', 'blanda', 'idioma', 'herramienta', 'software'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habilidades_uid ON habilidades("Uid");

CREATE TABLE IF NOT EXISTS referencias (
    id          SERIAL PRIMARY KEY,
    "Uid"       INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    nombre      VARCHAR(200) NOT NULL,
    cargo       VARCHAR(200),
    empresa     VARCHAR(200),
    telefono    VARCHAR(20) NOT NULL,
    tipo        VARCHAR(20),
    -- Valores: 'personal', 'laboral'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referencias_uid ON referencias("Uid");

CREATE TABLE IF NOT EXISTS grupo_familiar (
    id              SERIAL PRIMARY KEY,
    "Uid"           INTEGER NOT NULL REFERENCES users("Uid") ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    parentesco      VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,
    documento       VARCHAR(50),
    ocupacion       VARCHAR(200),
    telefono        VARCHAR(20),
    dependiente     BOOLEAN DEFAULT FALSE,
    -- TRUE si es dependiente económico
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grupo_familiar_uid ON grupo_familiar("Uid");

-- ============================================================
-- MÓDULO EVALUACIONES DE DESEMPEÑO
-- ============================================================

CREATE TABLE IF NOT EXISTS periodos_evaluacion (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    -- Ej: 'Semestral Enero-Junio 2026'
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    estado       VARCHAR(20) DEFAULT 'configuracion',
    -- Valores: 'configuracion', 'activo', 'cerrado'
    empresa      VARCHAR(10),
    -- Filtrar por empresa: 'AP', 'AT', 'ME', NULL = todas
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias_evaluacion (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(200) NOT NULL,
    -- Ej: 'Competencias Técnicas', 'Comportamiento', 'Objetivos'
    descripcion      TEXT,
    peso_porcentaje  NUMERIC(5,2) NOT NULL DEFAULT 100,
    -- Porcentaje del total (debe sumar 100 entre todas las categorias activas)
    orden            INTEGER DEFAULT 0,
    activo           BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS criterios_evaluacion (
    id               SERIAL PRIMARY KEY,
    categoria_id     INTEGER NOT NULL REFERENCES categorias_evaluacion(id) ON DELETE CASCADE,
    nombre           VARCHAR(300) NOT NULL,
    -- Ej: 'Trabajo en equipo', 'Puntualidad', 'Cumplimiento de metas'
    descripcion      TEXT,
    escala_min       INTEGER DEFAULT 1,
    escala_max       INTEGER DEFAULT 5,
    peso_porcentaje  NUMERIC(5,2) NOT NULL DEFAULT 100,
    -- Peso dentro de la categoría
    orden            INTEGER DEFAULT 0,
    activo           BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_criterios_categoria ON criterios_evaluacion(categoria_id);

CREATE TABLE IF NOT EXISTS evaluaciones_desempeno (
    id                    SERIAL PRIMARY KEY,
    periodo_id            INTEGER NOT NULL REFERENCES periodos_evaluacion(id) ON DELETE RESTRICT,
    evaluado_uid          INTEGER NOT NULL REFERENCES users("Uid") ON DELETE RESTRICT,
    evaluador_uid         INTEGER NOT NULL REFERENCES users("Uid") ON DELETE RESTRICT,
    estado                VARCHAR(30) DEFAULT 'pendiente',
    -- Valores: 'pendiente', 'en_proceso', 'completada', 'revisada', 'aprobada'
    calificacion_final    NUMERIC(5,2),
    -- Calificación total ponderada (calculada al completar)
    fortalezas            TEXT,
    areas_mejora          TEXT,
    compromisos           TEXT,
    plan_mejora           TEXT,
    comentarios_evaluador TEXT,
    comentarios_evaluado  TEXT,
    firma_evaluador       TEXT,
    -- Base64 de la firma digital del evaluador
    firma_evaluado        TEXT,
    -- Base64 de la firma digital del evaluado
    fecha_inicio          TIMESTAMPTZ,
    fecha_fin             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (periodo_id, evaluado_uid)
    -- Un colaborador solo puede tener una evaluación por período
);

CREATE INDEX IF NOT EXISTS idx_eval_periodo ON evaluaciones_desempeno(periodo_id);
CREATE INDEX IF NOT EXISTS idx_eval_evaluado ON evaluaciones_desempeno(evaluado_uid);
CREATE INDEX IF NOT EXISTS idx_eval_evaluador ON evaluaciones_desempeno(evaluador_uid);
CREATE INDEX IF NOT EXISTS idx_eval_estado ON evaluaciones_desempeno(estado);

CREATE TABLE IF NOT EXISTS calificaciones_detalle (
    id              SERIAL PRIMARY KEY,
    evaluacion_id   INTEGER NOT NULL REFERENCES evaluaciones_desempeno(id) ON DELETE CASCADE,
    criterio_id     INTEGER NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE RESTRICT,
    calificacion    NUMERIC(3,1) NOT NULL,
    -- Calificación en escala del criterio (ej: 1.0 a 5.0)
    comentario      TEXT,
    UNIQUE (evaluacion_id, criterio_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_evaluacion ON calificaciones_detalle(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_cal_criterio ON calificaciones_detalle(criterio_id);

CREATE TABLE IF NOT EXISTS evaluacion_objetivos (
    id                  SERIAL PRIMARY KEY,
    evaluacion_id       INTEGER NOT NULL REFERENCES evaluaciones_desempeno(id) ON DELETE CASCADE,
    descripcion         TEXT NOT NULL,
    meta_esperada       TEXT,
    resultado_obtenido  TEXT,
    peso_porcentaje     NUMERIC(5,2) DEFAULT 100,
    cumplimiento_pct    NUMERIC(5,2),
    -- 0-100% de cumplimiento
    calificacion        NUMERIC(3,1)
    -- Calificación derivada del cumplimiento
);

CREATE INDEX IF NOT EXISTS idx_obj_evaluacion ON evaluacion_objetivos(evaluacion_id);

-- ============================================================
-- DATOS INICIALES REQUERIDOS: Categorías y criterios base
-- (idempotente por ON CONFLICT DO NOTHING)
-- ============================================================

-- Insertar rol 'Inventario' si no existe
INSERT INTO roles ("Rname")
VALUES ('Inventario')
ON CONFLICT DO NOTHING;

-- Categorías base para evaluaciones (pueden personalizarse después)
INSERT INTO categorias_evaluacion (nombre, descripcion, peso_porcentaje, orden)
VALUES
    ('Competencias Técnicas', 'Conocimientos y habilidades técnicas del cargo', 30, 1),
    ('Competencias Blandas', 'Trabajo en equipo, comunicación, actitud', 25, 2),
    ('Cumplimiento de Objetivos', 'Metas y resultados del período', 35, 3),
    ('Comportamiento Organizacional', 'Puntualidad, orden, cumplimiento normas', 10, 4)
ON CONFLICT DO NOTHING;

-- Criterios base por categoría
-- Nota: Los IDs dependen del orden de inserción, usar subconsulta en producción
DO $$
DECLARE
    cat_tecnica INTEGER;
    cat_blanda INTEGER;
    cat_objetivos INTEGER;
    cat_comportamiento INTEGER;
BEGIN
    SELECT id INTO cat_tecnica FROM categorias_evaluacion WHERE nombre = 'Competencias Técnicas';
    SELECT id INTO cat_blanda FROM categorias_evaluacion WHERE nombre = 'Competencias Blandas';
    SELECT id INTO cat_objetivos FROM categorias_evaluacion WHERE nombre = 'Cumplimiento de Objetivos';
    SELECT id INTO cat_comportamiento FROM categorias_evaluacion WHERE nombre = 'Comportamiento Organizacional';

    IF cat_tecnica IS NOT NULL AND NOT EXISTS (SELECT 1 FROM criterios_evaluacion WHERE categoria_id = cat_tecnica) THEN
        INSERT INTO criterios_evaluacion (categoria_id, nombre, descripcion, peso_porcentaje, orden)
        VALUES
            (cat_tecnica, 'Conocimiento del Cargo', 'Dominio de las funciones y responsabilidades del cargo', 40, 1),
            (cat_tecnica, 'Calidad del Trabajo', 'Exactitud, orden y presentación del trabajo realizado', 35, 2),
            (cat_tecnica, 'Uso de Herramientas', 'Manejo de herramientas, sistemas y equipos asignados', 25, 3);
    END IF;

    IF cat_blanda IS NOT NULL AND NOT EXISTS (SELECT 1 FROM criterios_evaluacion WHERE categoria_id = cat_blanda) THEN
        INSERT INTO criterios_evaluacion (categoria_id, nombre, descripcion, peso_porcentaje, orden)
        VALUES
            (cat_blanda, 'Trabajo en Equipo', 'Colaboración y apoyo a compañeros y otras áreas', 30, 1),
            (cat_blanda, 'Comunicación', 'Claridad y efectividad en la comunicación verbal y escrita', 30, 2),
            (cat_blanda, 'Iniciativa y Proactividad', 'Capacidad de anticiparse y proponer mejoras', 20, 3),
            (cat_blanda, 'Adaptabilidad', 'Respuesta positiva ante cambios y nuevos retos', 20, 4);
    END IF;

    IF cat_objetivos IS NOT NULL AND NOT EXISTS (SELECT 1 FROM criterios_evaluacion WHERE categoria_id = cat_objetivos) THEN
        INSERT INTO criterios_evaluacion (categoria_id, nombre, descripcion, peso_porcentaje, orden)
        VALUES
            (cat_objetivos, 'Cumplimiento de Metas', 'Porcentaje de cumplimiento de los objetivos del período', 60, 1),
            (cat_objetivos, 'Calidad de Resultados', 'Calidad de los entregables y resultados obtenidos', 40, 2);
    END IF;

    IF cat_comportamiento IS NOT NULL AND NOT EXISTS (SELECT 1 FROM criterios_evaluacion WHERE categoria_id = cat_comportamiento) THEN
        INSERT INTO criterios_evaluacion (categoria_id, nombre, descripcion, peso_porcentaje, orden)
        VALUES
            (cat_comportamiento, 'Puntualidad y Asistencia', 'Cumplimiento del horario y ausencias justificadas', 50, 1),
            (cat_comportamiento, 'Cumplimiento de Normas', 'Acatamiento de políticas, procedimientos y reglamentos', 50, 2);
    END IF;
END $$;

SELECT 'Migración 002 completada correctamente' AS resultado;
