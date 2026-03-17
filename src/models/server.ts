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
import RActaRecarga from '../routes/actaRecarga';
import RSsgt from '../routes/ssgt';
import RWhatsApp from '../routes/whatsapp';
import { Area } from './area';
import { Permiso } from './permisos';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';
import { Registro, Sumatoria, Novedad, NovedadHistorico, HistoricoHorasExtras} from './time'
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
        this.app.use('/api/actas-recargas', RActaRecarga);
        this.app.use('/api/ssgt', RSsgt);
        this.app.use('/api/whatsapp', RWhatsApp);
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
        this.app.use('/uploads', express.static('uploads'));
        this.app.use('/public', express.static('public'));
    }
    async DBconnect(){
        try{
            /* {force: true}{alter: true} */
            await sequelize.authenticate();
            
            await Role.sync();
            await Area.sync({alter: false});
            await User.sync({alter: true});
            await Product.sync();
            await Permiso.sync({alter: true});
            await Registro.sync();
            await Sumatoria.sync();
            await HistoricoHorasExtras.sync();
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
            await ParticipanteAsistencia.sync({ alter: true });

            // Sincronizar modelos de actas de recargas
            const { ActaRecarga } = await import('./actaRecarga');
            const { ActaRecargaAcceso } = await import('./actaRecargaAcceso');
            await ActaRecarga.sync({ force: true });
            await ActaRecargaAcceso.sync({ alter: false });

            // Sincronizar modelos SSGT
            const { AccidenteIncidente, InvestigacionAccidente, EvidenciaAccidente, SeguimientoAccion } = await import('./ssgt');
            await AccidenteIncidente.sync({ alter: true });
            await InvestigacionAccidente.sync({ alter: true });
            await EvidenciaAccidente.sync({ alter: true });
            await SeguimientoAccion.sync({ alter: true });

            // Sincronizar modelos EPP
            const { CatalogoEPP, EntregaEPP, DetalleEntregaEPP, FirmaEntregaEPP, AlertaEPP } = await import('./ssgt');
            await CatalogoEPP.sync({ alter: true });
            await EntregaEPP.sync({ alter: true });
            await DetalleEntregaEPP.sync({ alter: true });
            await FirmaEntregaEPP.sync({ alter: true });
            await AlertaEPP.sync({ alter: true });

            // Sincronizar modelos Documentos Firma
            const { DocumentoFirma, CampoFirmaDocumento } = await import('./ssgt');
            await DocumentoFirma.sync({ alter: true });
            await CampoFirmaDocumento.sync({ alter: true });

            // Sincronizar modelos Inspecciones (SafetyCulture)
            const { PlantillaInspeccion, SeccionPlantilla, PreguntaPlantilla, InspeccionSSGT, RespuestaInspeccion, AccionCorrectivaInspeccion, CondicionInsegura } = await import('./ssgt');
            await PlantillaInspeccion.sync({ alter: true });
            await SeccionPlantilla.sync({ alter: true });
            await PreguntaPlantilla.sync({ alter: true });
            await InspeccionSSGT.sync({ alter: true });
            await RespuestaInspeccion.sync({ alter: true });
            await AccionCorrectivaInspeccion.sync({ alter: true });
            await CondicionInsegura.sync({ alter: true });

            // Sincronizar modelos Capacitaciones SST
            const { CapacitacionSST, EvaluacionCapacitacion, PreguntaEvaluacion, RespuestaEvaluacion } = await import('./ssgt');
            await CapacitacionSST.sync({ alter: true });
            await EvaluacionCapacitacion.sync({ alter: true });
            await PreguntaEvaluacion.sync({ alter: true });
            await RespuestaEvaluacion.sync({ alter: true });

            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion"); 

        }
    }
}

export default Server