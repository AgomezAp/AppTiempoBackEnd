import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from 'morgan';

import { errorHandler } from '../middleware/errorHandler';
import { globalLimiter } from '../middleware/rateLimiter';
import logger, { morganStream } from '../utils/logger';

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
import RDestinatariosPermiso from '../routes/destinatarioPermiso';
import RTipoPermiso from '../routes/tipoPermiso';
import RConfigEmpresa from '../routes/configEmpresa';
import RPlantillaInventario from '../routes/plantillaInventario';
import RPlantillaCertificado from '../routes/plantillaCertificado';

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
import RInvAdmin from '../routes/inventario/inventarioAdmin';
import sequelizeInventario from '../database/connection-inventario';
import CampoTipoInventario from '../models/inventario/campoTipoInventario';

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
        if (!process.env.SECRET_KEY) {
            throw new Error('Variable de entorno SECRET_KEY es obligatoria. El servidor no puede arrancar sin ella.');
        }
        this.app = express();
        this.port = process.env.PORT;
        this.httpServer = http.createServer(this.app);
        this.middlewares();
        this.router();
        this.errorMiddleware();
        this.DBconnect();
        this.listen();
    }
    listen (){
        initIO(this.httpServer);
        this.httpServer.listen(this.port, () => {
            logger.info(`Servidor corriendo en puerto ${this.port}`);
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
        this.app.use('/api/destinatarios-permiso', RDestinatariosPermiso);
        this.app.use('/api/tipos-permiso', RTipoPermiso);
        this.app.use('/api/config-empresas', RConfigEmpresa);
        this.app.use('/api/plantillas-inventario', RPlantillaInventario);
        this.app.use('/api/plantillas-certificado', RPlantillaCertificado);

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
        this.app.use('/api/inventario-admin', RInvAdmin);
    }
    middlewares(){
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .map(o => o.trim())
            .filter(Boolean);

        // 1. HTTP request logging con Morgan → Winston
        this.app.use(morgan('combined', { stream: morganStream }));

        // 2. Rate limiting global (300 req/15min por IP)
        this.app.use(globalLimiter);

        // 3. Headers de seguridad HTTP via helmet
        // crossOriginResourcePolicy: 'cross-origin' permite al frontend cargar
        // imágenes desde /uploads en dominio distinto (api.horariosap.com)
        this.app.use(helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            strictTransportSecurity: {
                maxAge: 63072000, // 2 años en segundos
                includeSubDomains: true,
                preload: true,
            },
        }));

        // 4. CORS restringido a los orígenes definidos en ALLOWED_ORIGINS (.env)
        // CSRF no aplica: JWT viaja en Authorization header, no en cookies,
        // por lo que el browser no lo envía automáticamente en ataques CSRF.
        this.app.use(cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true); // curl, Postman, apps móviles
                if (allowedOrigins.includes(origin)) return callback(null, true);
                callback(new Error(`Origen no permitido por CORS: ${origin}`));
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
            credentials: true,
            optionsSuccessStatus: 200,
        }));

        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Servir archivos estáticos
        this.app.use('/uploads', express.static('public/uploads'));
        this.app.use('/uploads', express.static('uploads'));
        this.app.use('/public', express.static('public'));
    }

    // Debe registrarse DESPUÉS de todas las rutas
    errorMiddleware(){
        this.app.use(errorHandler);
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
            // Migración manual: índice único (Rid, modulo) — evita que se dupliquen filas
            // cada vez que se abre/crea un rol. Requiere que la tabla ya esté libre de
            // duplicados (se depuró manualmente en producción antes de este despliegue).
            try {
              await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS role_modulos_rid_modulo_key ON role_modulos ("Rid", modulo);');
            } catch (e) {
              console.warn('[Migración role_modulos] No se pudo crear índice único (puede haber duplicados pendientes):', e);
            }

            // Sincronizar nuevos modelos configurables (P4, P5, P3, P1)
            const { DestinatarioPermiso } = await import('./destinatarioPermiso');
            await DestinatarioPermiso.sync({ alter: false });

            const { TipoPermiso } = await import('./tipoPermiso');
            await TipoPermiso.sync({ alter: false });

            const { ConfigEmpresa } = await import('./configEmpresa');
            await ConfigEmpresa.sync({ alter: false });

            const { PlantillaInventario, ItemPlantilla, InventarioUsuario } = await import('./plantillaInventario');
            await PlantillaInventario.sync({ alter: false });
            await ItemPlantilla.sync({ alter: false });
            await InventarioUsuario.sync({ alter: false });

            const { PlantillaCertificado } = await import('./plantillaCertificado');
            await PlantillaCertificado.sync({ alter: false });

            // Poblar tablas nuevas con datos iniciales si están vacías
            const { runSeeds } = await import('../database/seeds');
            await runSeeds();

            // Migración inventario_general: agregar columnas nuevas sin romper datos existentes
            try {
              await sequelizeInventario.query('ALTER TABLE consumibles ADD COLUMN IF NOT EXISTS "atributosExtra" JSONB DEFAULT \'{}\'');
              await CampoTipoInventario.sync({ alter: false });
            } catch (e) {
              console.warn('[Migración inventario] No se pudo ejecutar migración:', e);
            }

            console.log('Conexión establecida correctamente');
        }catch (error){
            console.log("Error de conexion");

        }
    }
}

export default Server
