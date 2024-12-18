import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';

import sequelize from '../database/connection';
import Rcategory from '../routes/category';
import Rproduct from '../routes/product';
import RRole from '../routes/product';
import rUser from '../routes/user';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';

dotenv.config();
class Server{

    private app: Application;
    private port?: string;

    constructor(){
        this.app = express();
        this.port = process.env.PORT;
        this.middlewares();
        this.router();
        this.DBconnect();
        this.listen();
    }
    listen (){
        this.app.listen(this.port, () => {
            console.log("Server running on port: " + this.port);
        });
    }
    router(){
        this.app.use(rUser)
        this.app.use(Rproduct)
        this.app.use(Rcategory);
        this.app.use(RRole)
    }
    middlewares(){
        this.app.use(express.json())
        this.app.use(cors({
            origin: '*', // Permite todas las solicitudes de origen cruzado
            methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'], // Métodos permitidos
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
    }
    async DBconnect(){
        try{
            /* {force: true}{alter: true} */
            await sequelize.authenticate();
            await Role.sync( );
            await User.sync( );
            await Product.sync( );
            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server