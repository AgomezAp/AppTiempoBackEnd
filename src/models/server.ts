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
import RTime from '../routes/time';
import RNovedad from '../routes/novedad';
import { Area } from './area';
import { Permiso } from './permisos';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';
import { Registro, Sumatoria, Novedad, NovedadHistorico} from './time'

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
        this.app.use(RPermisos)
        this.app.use(RArea)
        this.app.use(RTime);
        this.app.use(RNovedad);

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
            
            await Role.sync();
            await Area.sync({alter: true});
            await User.sync();
            await Product.sync();
            await Permiso.sync({alter: true});
            await Registro.sync();
            await Sumatoria.sync();
            await Novedad.sync({alter: true});
            await NovedadHistorico.sync();


            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server