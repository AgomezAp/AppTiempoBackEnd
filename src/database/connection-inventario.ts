import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

// Conexión a la base de datos de inventario_general
// Usada SOLO por los modelos del módulo inventario
const databaseUrlInventario = process.env.DATABASE_URL_INVENTARIO;

if (!databaseUrlInventario) {
    throw new Error('DATABASE_URL_INVENTARIO no está definida en las variables de entorno');
}

const sequelizeInventario = new Sequelize(databaseUrlInventario, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false,
});

sequelizeInventario.authenticate()
    .then(() => {
        console.log('Base de datos INVENTARIO conectada correctamente.');
    })
    .catch((error: unknown) => {
        console.error('Error al conectar con la base de datos de inventario:', error);
    });

export default sequelizeInventario;
