-- Migration 006: Columnas para horarios especiales e incapacidades
-- Fecha: 2026-05-05

-- 1. Agregar hora de entrada permitida en HorarioUsuario
--    Permite configurar a qué hora puede llegar cada persona por día de semana.
ALTER TABLE horario_usuario
  ADD COLUMN IF NOT EXISTS "horaEntrada" VARCHAR(5) DEFAULT '07:30';

-- 2. Agregar fecha de fin en permisos
--    Necesario para calcular los días de incapacidad (fechaFin - fecha + 1).
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP WITH TIME ZONE;
