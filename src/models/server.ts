import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';

import sequelize from '../database/connection';
import RArea from '../routes/area';
import Rcategory from '../routes/category';
import RPermisos from '../routes/permisos';
import Rproduct from '../routes/product';
import RRole from '../routes/product';
import rUser from '../routes/user';
import { Area } from './area';
import { Permiso } from './permisos';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';

dotenv.config();

/**
 * Clase Server para configurar y ejecutar el servidor.
 */

class Server{

    private app: Application;
    private port?: string;

      /**
     * Constructor de la clase Server.
     * 
     * @param {string} port - El puerto en el que el servidor escuchará las solicitudes.
     */

    constructor(){
        this.app = express();
        this.port = process.env.PORT;
        this.middlewares();
        this.router();
        this.DBconnect();
        this.listen();
    }

    /**
     * Inicia el servidor.
     */
    
    listen (){
        this.app.listen(this.port, () => {
            console.log("Server running on port: " + this.port);
        });
    }

    
    /**
     * Configura las rutas del servidor.
     */

    router(){
        this.app.use(rUser)
        this.app.use(Rproduct)
        this.app.use(Rcategory);
        this.app.use(RRole)
        this.app.use(RPermisos)
        this.app.use(RArea)

    }

     /**
     * Configura los middlewares del servidor.
     */

    middlewares(){
        this.app.use(express.json())
        this.app.use(cors({
            origin: '*', // Permite todas las solicitudes de origen cruzado
            methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'], // Métodos permitidos
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
    }

    /**
     * Conecta a la base de datos y sincroniza los modelos.
     * 
     * @returns {Promise<void>} - Una promesa que se resuelve si la conexión y sincronización son exitosas.
     */

    async DBconnect(){
        try{
            /* {force: true}{alter: true} */
            await sequelize.authenticate();
            
            await Role.sync();
            await Area.sync({alter: true});
            await User.sync();
            await Product.sync();
            await Permiso.sync();
            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server