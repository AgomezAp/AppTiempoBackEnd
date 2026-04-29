-- ============================================================
-- MIGRACIÓN 001: Nuevas columnas en tabla users (api_inventario)
-- Para módulo de Hoja de Vida / Perfil completo de colaborador
-- IDEMPOTENTE: usa ADD COLUMN IF NOT EXISTS
-- Ejecutar conectado a: api_inventario
-- ============================================================

-- Datos personales adicionales
ALTER TABLE users ADD COLUMN IF NOT EXISTS segundo_nombre VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS segundo_apellido VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) DEFAULT 'CC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lugar_nacimiento VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS genero VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(20);

-- Datos de contacto y residencia
ALTER TABLE users ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS barrio VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono_fijo VARCHAR(20);

-- Contacto de emergencia
ALTER TABLE users ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contacto_emergencia_parentesco VARCHAR(50);

-- Datos de salud y tallas (para dotación/EPP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS rh VARCHAR(5);
ALTER TABLE users ADD COLUMN IF NOT EXISTS talla_camisa VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS talla_pantalon VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS talla_zapatos VARCHAR(10);

-- Seguridad social
ALTER TABLE users ADD COLUMN IF NOT EXISTS eps VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS arl VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS caja_compensacion VARCHAR(100);

-- Datos bancarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS numero_cuenta_bancaria VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_cuenta_bancaria VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banco VARCHAR(100);

-- Perfil y estado
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado_colaborador VARCHAR(20) DEFAULT 'activo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS fecha_retiro DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivo_retiro TEXT;

-- Verificar que las columnas se crearon
SELECT column_name, data_type, character_maximum_length, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'segundo_nombre', 'segundo_apellido', 'tipo_documento', 'fecha_nacimiento',
    'lugar_nacimiento', 'genero', 'estado_civil', 'direccion', 'ciudad', 'barrio',
    'telefono_fijo', 'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
    'contacto_emergencia_parentesco', 'rh', 'talla_camisa', 'talla_pantalon',
    'talla_zapatos', 'eps', 'arl', 'caja_compensacion', 'numero_cuenta_bancaria',
    'tipo_cuenta_bancaria', 'banco', 'foto_url', 'estado_colaborador',
    'fecha_retiro', 'motivo_retiro'
  )
ORDER BY column_name;
