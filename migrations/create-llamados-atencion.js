require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL no definida. Defínela como variable de entorno.');
  process.exit(1);
}

const db = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const sql = `
CREATE TABLE IF NOT EXISTS llamados_atencion (
  id SERIAL PRIMARY KEY,
  "Uid" INTEGER NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  soporte_url VARCHAR(500),
  admin_nombre VARCHAR(200),
  reconocido BOOLEAN NOT NULL DEFAULT FALSE,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_llamados_user FOREIGN KEY ("Uid") REFERENCES users("Uid") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_llamados_uid ON llamados_atencion("Uid");
CREATE INDEX IF NOT EXISTS idx_llamados_estado ON llamados_atencion(estado);
`;

db.authenticate()
  .then(() => db.query(sql))
  .then(() => {
    console.log('OK: tabla llamados_atencion creada correctamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
