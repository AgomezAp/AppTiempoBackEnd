import { Router, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateToken, validateRRHH } from './validateToken';
import {
    listarUsuariosExpediente,
    obtenerHojaVidaCompleta,
    generarPdfHojaVida,
    agregarExperiencia, editarExperiencia, eliminarExperiencia,
    agregarFormacion, editarFormacion, eliminarFormacion,
    agregarHabilidad, eliminarHabilidad,
    agregarReferencia, eliminarReferencia,
    agregarFamiliar, editarFamiliar, eliminarFamiliar,
    obtenerPermisosExpediente,
    obtenerNovedadesExpediente,
    obtenerActasInventarioExpediente,
    listarDocumentosExpediente,
    subirDocumentoExpediente,
    eliminarDocumentoExpediente,
    descargarDocumentoExpediente,
    listarNotasExpediente,
    agregarNotaExpediente,
    eliminarNotaExpediente,
    listarLlamados,
    agregarLlamado,
    editarLlamado,
    eliminarLlamado,
    generarPdfLlamado,
    inicializarCarpetasExpediente
} from '../controllers/hojaVida';

const router = Router();

// Cast para controladores que retornan Promise<Response> (compatibilidad Express v5 types)
const rh = (fn: Function): RequestHandler => fn as RequestHandler;

// ---- Multer: documentos del expediente ----
const storageExpediente = multer.diskStorage({
    destination: (req, _file, cb) => {
        const uid = (req.params.uid as string) || 'general';
        const dir = path.join('public', 'uploads', 'expediente', uid);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});
const uploadExpediente = multer({
    storage: storageExpediente,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// ---- Multer: soportes de llamados de atención ----
const storageLlamados = multer.diskStorage({
    destination: (req, _file, cb) => {
        const uid = (req.params.uid as string) || 'general';
        const dir = path.join('public', 'uploads', 'llamados', uid);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `llamado_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});
const uploadLlamado = multer({
    storage: storageLlamados,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// ============================================================
// Vista carpetas — solo Admin / RRHH
// ============================================================
router.get('/usuarios', validateToken, validateRRHH, rh(listarUsuariosExpediente));
router.post('/inicializar-carpetas', validateToken, validateRRHH, rh(inicializarCarpetasExpediente));

// ============================================================
// Hoja de vida personal
// ============================================================
router.get('/:uid', validateToken, rh(obtenerHojaVidaCompleta));
router.get('/:uid/pdf', validateToken, rh(generarPdfHojaVida));

// ---- Experiencia laboral ----
router.post('/:uid/experiencia', validateToken, rh(agregarExperiencia));
router.put('/:uid/experiencia/:id', validateToken, rh(editarExperiencia));
router.delete('/:uid/experiencia/:id', validateToken, rh(eliminarExperiencia));

// ---- Formación académica ----
router.post('/:uid/formacion', validateToken, rh(agregarFormacion));
router.put('/:uid/formacion/:id', validateToken, rh(editarFormacion));
router.delete('/:uid/formacion/:id', validateToken, rh(eliminarFormacion));

// ---- Habilidades ----
router.post('/:uid/habilidades', validateToken, rh(agregarHabilidad));
router.delete('/:uid/habilidades/:id', validateToken, rh(eliminarHabilidad));

// ---- Referencias ----
router.post('/:uid/referencias', validateToken, rh(agregarReferencia));
router.delete('/:uid/referencias/:id', validateToken, rh(eliminarReferencia));

// ---- Grupo familiar ----
router.post('/:uid/grupo-familiar', validateToken, rh(agregarFamiliar));
router.put('/:uid/grupo-familiar/:id', validateToken, rh(editarFamiliar));
router.delete('/:uid/grupo-familiar/:id', validateToken, rh(eliminarFamiliar));

// ---- Expediente: Trazabilidad empresa ----
router.get('/:uid/permisos', validateToken, rh(obtenerPermisosExpediente));
router.get('/:uid/novedades', validateToken, rh(obtenerNovedadesExpediente));
router.get('/:uid/actas-inventario', validateToken, rh(obtenerActasInventarioExpediente));

// ---- Expediente: Documentos adjuntos ----
router.get('/:uid/documentos', validateToken, rh(listarDocumentosExpediente));
router.post('/:uid/documentos', validateToken, validateRRHH, uploadExpediente.single('archivo'), rh(subirDocumentoExpediente));
router.get('/:uid/documentos/:docId/descargar', validateToken, rh(descargarDocumentoExpediente));
router.delete('/:uid/documentos/:docId', validateToken, validateRRHH, rh(eliminarDocumentoExpediente));

// ---- Expediente: Notas admin ----
router.get('/:uid/notas', validateToken, validateRRHH, rh(listarNotasExpediente));
router.post('/:uid/notas', validateToken, validateRRHH, rh(agregarNotaExpediente));
router.delete('/:uid/notas/:notaId', validateToken, validateRRHH, rh(eliminarNotaExpediente));

// ---- Llamados de atención ----
router.get('/:uid/llamados', validateToken, validateRRHH, rh(listarLlamados));
router.post('/:uid/llamados', validateToken, validateRRHH, uploadLlamado.single('soporte'), rh(agregarLlamado));
router.put('/:uid/llamados/:llamadoId', validateToken, validateRRHH, uploadLlamado.single('soporte'), rh(editarLlamado));
router.delete('/:uid/llamados/:llamadoId', validateToken, validateRRHH, rh(eliminarLlamado));
router.get('/:uid/llamados/:llamadoId/pdf', validateToken, validateRRHH, rh(generarPdfLlamado));

export default router;
