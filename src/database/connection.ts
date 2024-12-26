import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

/**
 * URL de la base de datos obtenida de las variables de entorno.
 * 
 * @type {string}
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}

/**
 * Instancia de Sequelize para la conexión a la base de datos.
 * 
 * @type {Sequelize}
 */

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Esto es necesario para algunas configuraciones de PostgreSQL en Render
        }
    },
   
});
/**
 * Autentica la conexión a la base de datos.
 * 
 * @returns {Promise<void>} - Una promesa que se resuelve si la autenticación es exitosa.
 * 
 * @example
 * // Ejemplo de uso:
 * sequelize.authenticate()
 *     .then(() => {
 *         console.log('Database connected successfully.');
 *     })
 *     .catch((error) => {
 *         console.error('Unable to connect to the database:', error);
 *     });
 */
sequelize.authenticate()
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch((error) => {
        console.error('Unable to connect to the database:', error);
    });

export default sequelize;