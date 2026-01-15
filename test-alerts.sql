-- Script para crear datos de prueba en la tabla permisos
-- Ejecuta esto en tu base de datos para generar alertas de prueba

-- Obtén la fecha de ayer (para que sea procesada por el cron/trigger)
-- INSERT INTO permisos (nombre, numeroDocumento, emailPersonal, emailLider, fecha, tipo, horaEntrada, horaSalida, Uid, observaciones)
-- VALUES 
-- ('Juan García', '123456789', 'juan@example.com', 'lider@example.com', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Permiso personal por horas', '08:00', '18:00', 1, 'Prueba'),
-- ('María López', '987654321', 'maria@example.com', 'lider@example.com', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Permiso personal por horas', '08:30', '19:00', 2, 'Prueba');

-- Nota: Si ejecutas esto manualmente, después ejecuta POST /api/admin/alerts/generate para disparar la generación de alertas
