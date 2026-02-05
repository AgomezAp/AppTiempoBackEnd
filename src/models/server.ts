import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';

import sequelize from '../database/connection';
import RArea from '../routes/area';
import Rcategory from '../routes/category';
import RPermisos from '../routes/permisos';
import Rproduct from '../routes/product';
import RRole from '../routes/product';
import rUser from '../routes/user';
import RTime from '../routes/time';
import RNovedad from '../routes/novedad';
import RArchivo from '../routes/archivo';
import RCertificado from '../routes/certificado';
import RNominaConfig from '../routes/nominaConfig';
import RAdmin from '../routes/admin';
import RRoom from '../routes/room';
import RReservation from '../routes/reservation';
import RAsistencia from '../routes/asistencia';
import { Area } from './area';
import { Permiso } from './permisos';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';
import { Registro, Sumatoria, Novedad, NovedadHistorico} from './time'
import { Archivo } from './archivo';
import NominaConfig from './nominaConfig';
import { Room } from './room';
import { Reservation } from './reservation';

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
        this.app.use('/api/archivos', RArchivo);
        this.app.use('/api/certificados', RCertificado);
        this.app.use('/api/nomina-config', RNominaConfig);
        this.app.use('/api/admin', RAdmin);
        this.app.use(RRoom);
        this.app.use(RReservation);
        this.app.use('/api/asistencia', RAsistencia);
    }
    middlewares(){
        // CORS debe ir ANTES de express.json() y cualquier otra cosa
        this.app.use(cors({
            origin: '*', // Permite todas las solicitudes de origen cruzado
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos permitidos (incluir OPTIONS)
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
            credentials: true,
            optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) tienen problemas con 204
        }));
        
        // Middleware adicional para asegurar headers CORS en todas las respuestas
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            res.header('Access-Control-Allow-Credentials', 'true');
            
            // Maneja las solicitudes OPTIONS (preflight)
            if (req.method === 'OPTIONS') {
                res.status(200).end();
            } else {
                next();
            }
        });
        
        this.app.use(express.json());
        
        // Servir archivos estáticos
        this.app.use('/uploads', express.static('public/uploads'));
        this.app.use('/public', express.static('public'));
    }
    async DBconnect(){
        try{
            /* {force: true}{alter: true} */
            await sequelize.authenticate();
            
            await Role.sync();
            await Area.sync({alter: false});
            await User.sync({alter: false});
            await Product.sync();
            await Permiso.sync({alter: false});
            await Registro.sync();
            await Sumatoria.sync();
            await Novedad.sync({alter: false});
            await NovedadHistorico.sync({alter: false});
            await Archivo.sync({alter: false});
            await NominaConfig.sync({alter: false});
            const { Alert } = await import('./alert');
            await Alert.sync({ alter: false });
            await Room.sync({ alter: false });
            await Reservation.sync({ alter: false });
            
            // Sincronizar modelos de asistencia
            const { RegistroAsistencia, ParticipanteAsistencia } = await import('./asistencia');
            await RegistroAsistencia.sync();
            await ParticipanteAsistencia.sync();


            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server