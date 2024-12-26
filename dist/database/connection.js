"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = require("sequelize");
dotenv_1.default.config();
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
const sequelize = new sequelize_1.Sequelize(databaseUrl, {
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
exports.default = sequelize;
