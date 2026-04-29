import { Router, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateToken } from './validateToken';
import {
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
    eliminarNotaExpediente
} from '../controllers/hojaVida';

const router = Router();

// Cast para controladores que retornan Promise<Response> (compatibilidad Express v5 types)
const rh = (fn: Function): RequestHandler => fn as RequestHandler;

// Multer para documentos del expediente
const storageExpediente = multer.diskStorage({
    destination: (req, _file, cb) => {
        const uid = req.params.uid || 'general';
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
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// Hoja de vida completa
router.get('/:uid', validateToken, rh(obtenerHojaVidaCompleta));

// Generar PDF de hoja de vida
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
router.post('/:uid/documentos', validateToken, uploadExpediente.single('archivo'), rh(subirDocumentoExpediente));
router.get('/:uid/documentos/:docId/descargar', validateToken, rh(descargarDocumentoExpediente));
router.delete('/:uid/documentos/:docId', validateToken, rh(eliminarDocumentoExpediente));

// ---- Expediente: Notas admin ----
router.get('/:uid/notas', validateToken, rh(listarNotasExpediente));
router.post('/:uid/notas', validateToken, rh(agregarNotaExpediente));
router.delete('/:uid/notas/:notaId', validateToken, rh(eliminarNotaExpediente));

export default router;
