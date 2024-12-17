import cors from 'cors';
import express, { Application } from 'express';

import Rcategory from '../routes/category';
import Rproduct from '../routes/product';
import RRole from '../routes/product';
import rUser from '../routes/user';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';

class Server{

    private app: Application;
    private port?: string;

    constructor(){
        this.app = express();
        this.port =process.env.PORT 
        this.listen();
        this.middlewares();
        this.router();
        this.DBconnect();
    }
    listen (){
        this.app.listen(this.port, ()=>{
            console.log("This execute froam port: "+this.port)
        })
    }
    router(){
        this.app.use(rUser)
        this.app.use(Rproduct)
        this.app.use(Rcategory);
        this.app.use(RRole)
    }
    middlewares(){
        this.app.use(express.json())
        this.app.use(cors())
    }
    async DBconnect(){
        try{
            /* {force: true}{alter: true} */
            await User.sync();
            await Product.sync();
            await Role.sync();
            console.log('la tabla para el usuario fue creada');
            console.log("Conexion exitosa");
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server