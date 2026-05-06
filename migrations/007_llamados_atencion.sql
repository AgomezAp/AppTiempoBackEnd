-- ============================================================
-- Migración: llamados_atencion
-- Tabla para los llamados de atención del expediente laboral
-- Base de datos: api_inventario
-- ============================================================

CREATE TABLE IF NOT EXISTS `llamados_atencion` (
    `id`           INT          NOT NULL AUTO_INCREMENT,
    `Uid`          INT          NOT NULL,
    `tipo`         ENUM('verbal','escrito','suspension','otro') NOT NULL,
    `fecha`        DATE         NOT NULL,
    `descripcion`  TEXT         NOT NULL,
    `soporte_url`  VARCHAR(500) NULL,
    `admin_nombre` VARCHAR(200) NULL,
    `reconocido`   TINYINT(1)   NOT NULL DEFAULT 0,
    `estado`       ENUM('activo','archivado') NOT NULL DEFAULT 'activo',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_llamados_uid` (`Uid`),
    INDEX `idx_llamados_estado` (`estado`),
    CONSTRAINT `fk_llamados_user` FOREIGN KEY (`Uid`) REFERENCES `users` (`Uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
