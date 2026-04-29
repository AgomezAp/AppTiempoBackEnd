import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';

import sequelize from '../database/connection';
import '../database/connection-inventario'; // Inicializa y autentica la BD inventario al arrancar
import { initIO } from '../services/websocket.service';

// ---- Rutas módulo RRHH / horarios ----
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
import RHorarioUsuario from '../routes/horarioUsuario';
import RCompensacion from '../routes/compensacion';
import RContratos from '../routes/contratos';
import RHojaVida from '../routes/hojaVida';
import REvaluaciones from '../routes/evaluaciones';
import RRoles from '../routes/roles';

// ---- Rutas módulo Inventario ----
import RInvDispositivo from '../routes/inventario/dispositivo';
import RInvActaEntrega from '../routes/inventario/actaEntrega';
import RInvFirmaExterna from '../routes/inventario/firmaExterna';
import RInvConsumible from '../routes/inventario/consumible';
import RInvMobiliario from '../routes/inventario/mobiliario';
import RInvActaConsumible from '../routes/inventario/actaConsumible';
import RInvActaMobiliario from '../routes/inventario/actaMobiliario';
import RInvActaDevolucion from '../routes/inventario/actaDevolucion';
import RInvFirmaMobiliario from '../routes/inventario/firmaMobiliario';
import RInvTipoInventario from '../routes/inventario/tipoInventario';
import RInvAnalista from '../routes/inventario/analista';

// ---- Modelos de api_inventario (horarios) ----
import { Area } from './area';
import { Permiso } from './permisos';
import { Product } from './product';
import { Role } from './role';
import { User } from './user';
import { Registro, Sumatoria, Novedad, NovedadHistorico, HistoricoHorasExtras} from './time'
import { UploadHistorial } from './uploadHistorial'
import { HorarioUsuario } from './horarioUsuario'
import { Archivo } from './archivo';
import NominaConfig from './nominaConfig';
import { Room } from './room';
import { Reservation } from './reservation';

dotenv.config();
class Server{

    private app: Application;
    private port?: string;
    private httpServer: http.Server;

    constructor(){
        this.app = express();
        this.port = process.env.PORT;
        this.httpServer = http.createServer(this.app);
        this.middlewares();
        this.router();
        this.DBconnect();
        this.listen();
    }
    listen (){
        initIO(this.httpServer);
        this.httpServer.listen(this.port, () => {
            console.log("Server running on port: " + this.port);
        });
    }
    router(){
        // ---- Rutas horarios (existentes) ----
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
        this.app.use('/api/horario-usuario', RHorarioUsuario);
        this.app.use('/api/compensacion-horas', RCompensacion);

        // ---- Rutas nuevos módulos RRHH ----
        this.app.use('/api/contratos', RContratos);
        this.app.use('/api/hoja-vida', RHojaVida);
        this.app.use('/api/evaluaciones', REvaluaciones);
        this.app.use('/api/roles', RRoles);

        // ---- Rutas módulo Inventario ----
        this.app.use('/api/inventario/dispositivos', RInvDispositivo);
        this.app.use('/api/inventario/actas-entrega', RInvActaEntrega);
        this.app.use('/api/inventario/firma-externa', RInvFirmaExterna);
        this.app.use('/api/inventario/consumibles', RInvConsumible);
        this.app.use('/api/inventario/mobiliario', RInvMobiliario);
        this.app.use('/api/inventario/actas-consumibles', RInvActaConsumible);
        this.app.use('/api/inventario/actas-mobiliario', RInvActaMobiliario);
        this.app.use('/api/inventario/actas-devolucion', RInvActaDevolucion);
        this.app.use('/api/inventario/firma-mobiliario', RInvFirmaMobiliario);
        this.app.use('/api/inventario/tipos-inventario', RInvTipoInventario);
        this.app.use('/api/inventario/analistas', RInvAnalista);
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

        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
            await UploadHistorial.sync({ alter: true });
            await Registro.sync({ alter: true });
            await Sumatoria.sync();
            await HistoricoHorasExtras.sync();
            await HorarioUsuario.sync({ alter: true });
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
            await RegistroAsistencia.sync({ alter: true });
            await ParticipanteAsistencia.sync({ alter: true });
            // Migraciones manuales por limitaciones de Sequelize con PostgreSQL
            await sequelize.query('ALTER TABLE "registros_asistencia" ALTER COLUMN "facilitadorId" DROP NOT NULL;');
            await sequelize.query('ALTER TABLE "registros_asistencia" ALTER COLUMN "tema" TYPE TEXT;');
            // Recrear FK para garantizar que apunta a la tabla actual tras cualquier reescritura
            await sequelize.query('ALTER TABLE "participantes_asistencia" DROP CONSTRAINT IF EXISTS "participantes_asistencia_registroId_fkey";');
            await sequelize.query('ALTER TABLE "participantes_asistencia" ADD CONSTRAINT "participantes_asistencia_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_asistencia"("id");');

            // Sincronizar modelos de actas de recargas
            const { ActaRecarga } = await import('./actaRecarga');
            const { ActaRecargaAcceso } = await import('./actaRecargaAcceso');
            await ActaRecarga.sync({ alter: true });
            await ActaRecargaAcceso.sync({ alter: false });

            // Sincronizar modelos SSGT
            const { AccidenteIncidente, InvestigacionAccidente, EvidenciaAccidente, SeguimientoAccion } = await import('./ssgt');
            await AccidenteIncidente.sync({ alter: true });
            await InvestigacionAccidente.sync({ alter: true });
            await EvidenciaAccidente.sync({ alter: true });
            await SeguimientoAccion.sync({ alter: true });

            // Sincronizar modelo CompensacionHoras
            const { CompensacionHoras } = await import('./compensacionHoras');
            await CompensacionHoras.sync({ alter: true });

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
            const { PlantillaInspeccion, SeccionPlantilla, PreguntaPlantilla, InspeccionSSGT, RespuestaInspeccion, AccionCorrectivaInspeccion, CondicionInsegura, FotoRespuestaInspeccion } = await import('./ssgt');
            await PlantillaInspeccion.sync({ alter: true });
            await SeccionPlantilla.sync({ alter: true });
            await PreguntaPlantilla.sync({ alter: true });
            await InspeccionSSGT.sync({ alter: true });
            await RespuestaInspeccion.sync({ alter: true });
            await AccionCorrectivaInspeccion.sync({ alter: true });
            await CondicionInsegura.sync({ alter: true });
            await FotoRespuestaInspeccion.sync({ alter: true });

            // Sincronizar modelos Capacitaciones SST
            const { CapacitacionSST, EvaluacionCapacitacion, PreguntaEvaluacion, RespuestaEvaluacion } = await import('./ssgt');
            await CapacitacionSST.sync({ alter: true });
            await EvaluacionCapacitacion.sync({ alter: true });
            await PreguntaEvaluacion.sync({ alter: true });
            await RespuestaEvaluacion.sync({ alter: true });

            // Sincronizar nuevos módulos RRHH (contratos, hoja de vida, evaluaciones)
            // Usar alter: false → crea la tabla si no existe, sin modificar columnas existentes
            const { Contrato, ContratoModificacion } = await import('./contratos');
            await Contrato.sync({ alter: false });
            await ContratoModificacion.sync({ alter: false });

            const { ExperienciaLaboral, FormacionAcademica, Habilidad, Referencia, GrupoFamiliar } = await import('./hojaVida');
            await ExperienciaLaboral.sync({ alter: false });
            await FormacionAcademica.sync({ alter: false });
            await Habilidad.sync({ alter: false });
            await Referencia.sync({ alter: false });
            await GrupoFamiliar.sync({ alter: false });

            const { PeriodoEvaluacion, CategoriaEvaluacion, CriterioEvaluacion, EvaluacionDesempeno, CalificacionDetalle, EvaluacionObjetivo } = await import('./evaluaciones');
            await PeriodoEvaluacion.sync({ alter: false });
            await CategoriaEvaluacion.sync({ alter: false });
            await CriterioEvaluacion.sync({ alter: false });
            await EvaluacionDesempeno.sync({ alter: false });
            await CalificacionDetalle.sync({ alter: false });
            await EvaluacionObjetivo.sync({ alter: false });

            // Sincronizar tabla de permisos de módulos por rol
            const { RoleModulo } = await import('./roleModulo');
            await RoleModulo.sync({ alter: false });

            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion");

        }
    }
}

export default Server
