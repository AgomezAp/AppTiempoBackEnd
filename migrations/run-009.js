const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgres://alejandroap:0Ub9g5b(_exN@185.137.92.54:5432/inventario_general', {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});
const sqls = [
  'ALTER TABLE dispositivos DROP CONSTRAINT IF EXISTS "dispositivos_Uid_fkey"',
  'ALTER TABLE actas_entrega DROP CONSTRAINT IF EXISTS "actas_entrega_Uid_fkey"',
  'ALTER TABLE movimientos_dispositivo DROP CONSTRAINT IF EXISTS "movimientos_dispositivo_Uid_fkey"',
  'ALTER TABLE detalles_acta DROP CONSTRAINT IF EXISTS "detalles_acta_Uid_fkey"',
  'ALTER TABLE actas_devolucion DROP CONSTRAINT IF EXISTS "actas_devolucion_Uid_fkey"'
];
(async () => {
  for (const sql of sqls) {
    try {
      await seq.query(sql);
      const table = sql.match(/TABLE (\w+)/)[1];
      console.log('OK:', table);
    } catch(e) {
      console.error('ERR:', e.message);
    }
  }
  await seq.close();
  console.log('Listo.');
})();
