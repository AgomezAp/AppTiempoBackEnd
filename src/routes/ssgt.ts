import { Router } from 'express';
import multer from 'multer';
import validateToken from './validateToken';
import {
  crearAccidente,
  obtenerAccidentes,
  obtenerAccidentePorId,
  actualizarAccidente,
  eliminarAccidente,
  crearInvestigacion,
  subirEvidencia,
  eliminarEvidencia,
  crearSeguimiento,
  actualizarSeguimiento,
  obtenerDashboard,
} from '../controllers/ssgt';
import {
  crearEPP,
  obtenerEPPs,
  actualizarEPP,
  eliminarEPP,
  crearEntrega,
  obtenerEntregas,
  obtenerEntregaPorId,
  eliminarEntrega,
  obtenerInfoFirmaEpp,
  firmarEntregaEpp,
  reenviarCorreoFirmaEpp,
  generarPdfEntrega,
  obtenerAlertas,
  marcarAlertaLeida,
} from '../controllers/ssgtEpp';
import {
  subirDocumento,
  obtenerDocumentos,
  obtenerDocumentoPorId,
  eliminarDocumento,
  obtenerPaginaImagen,
  guardarCamposFirma,
  enviarParaFirmar,
  reenviarCorreoCampo,
  obtenerInfoFirmaDoc,
  firmarDocumento,
  generarPdfFirmado,
} from '../controllers/ssgtDocumentos';
import {
  crearInspeccion,
  obtenerInspecciones,
  actualizarInspeccion,
  eliminarInspeccion,
  guardarChecklist,
  crearCondicionInsegura,
  obtenerCondicionesInseguras,
  actualizarCondicionInsegura,
  eliminarCondicionInsegura,
  subirFotoCondicion,
  crearRiesgo,
  obtenerRiesgos,
  actualizarRiesgo,
  eliminarRiesgo,
  subirArchivoRiesgo,
  crearPlanAccion,
  obtenerPlanesAccion,
  actualizarPlanAccion,
  eliminarPlanAccion,
} from '../controllers/ssgtInspecciones';
import {
  crearCapacitacion,
  obtenerCapacitaciones,
  actualizarCapacitacion,
  eliminarCapacitacion,
  subirMaterial,
  crearEvaluacion,
  obtenerEvaluacion,
  responderEvaluacion,
  obtenerResultados,
} from '../controllers/ssgtCapacitaciones';

const router = Router();

const upload = multer({
  dest: 'uploads/ssgt/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadDoc = multer({
  dest: 'uploads/documentos/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para documentos
});

// Accidentes CRUD
router.post('/accidentes', validateToken, crearAccidente);
router.get('/accidentes', validateToken, obtenerAccidentes);
router.get('/accidentes/:id', validateToken, obtenerAccidentePorId);
router.put('/accidentes/:id', validateToken, actualizarAccidente);
router.delete('/accidentes/:id', validateToken, eliminarAccidente);

// Investigacion
router.post('/accidentes/:id/investigacion', validateToken, crearInvestigacion);

// Evidencias
router.post('/accidentes/:id/evidencias', validateToken, upload.single('archivo'), subirEvidencia);
router.delete('/evidencias/:id', validateToken, eliminarEvidencia);

// Seguimiento
router.post('/accidentes/:id/seguimiento', validateToken, crearSeguimiento);
router.put('/seguimiento/:id', validateToken, actualizarSeguimiento);

// Dashboard
router.get('/dashboard', validateToken, obtenerDashboard);

// ========================================
// EPP - Elementos de Protección Personal
// ========================================

// EPP Catálogo (protegido)
router.post('/epp/catalogo', validateToken, crearEPP);
router.get('/epp/catalogo', validateToken, obtenerEPPs);
router.put('/epp/catalogo/:id', validateToken, actualizarEPP);
router.delete('/epp/catalogo/:id', validateToken, eliminarEPP);

// EPP Entregas (protegido)
router.post('/epp/entregas', validateToken, crearEntrega);
router.get('/epp/entregas', validateToken, obtenerEntregas);
router.get('/epp/entregas/:id', validateToken, obtenerEntregaPorId);
router.delete('/epp/entregas/:id', validateToken, eliminarEntrega);
router.get('/epp/entregas/:id/pdf', validateToken, generarPdfEntrega);
router.post('/epp/entregas/:entregaId/firmas/:firmaId/reenviar', validateToken, reenviarCorreoFirmaEpp);

// EPP Firma pública (SIN auth)
router.get('/epp/firmar/:token', obtenerInfoFirmaEpp);
router.post('/epp/firmar/:token', firmarEntregaEpp);

// EPP Alertas (protegido)
router.get('/epp/alertas', validateToken, obtenerAlertas);
router.put('/epp/alertas/:id', validateToken, marcarAlertaLeida);

// ========================================
// DOCUMENTOS FIRMA
// ========================================

// Firma pública (SIN auth) - DEBE ir antes de las rutas con :id
router.get('/documentos-firma/firmar/:token', obtenerInfoFirmaDoc);
router.post('/documentos-firma/firmar/:token', firmarDocumento);

// CRUD Documentos (protegido)
router.post('/documentos-firma', validateToken, uploadDoc.single('archivo'), subirDocumento);
router.get('/documentos-firma', validateToken, obtenerDocumentos);
router.get('/documentos-firma/:id', validateToken, obtenerDocumentoPorId);
router.delete('/documentos-firma/:id', validateToken, eliminarDocumento);
router.get('/documentos-firma/:id/paginas/:num', validateToken, obtenerPaginaImagen);
router.post('/documentos-firma/:id/campos', validateToken, guardarCamposFirma);
router.put('/documentos-firma/:id/enviar', validateToken, enviarParaFirmar);
router.post('/documentos-firma/:id/campos/:campoId/reenviar', validateToken, reenviarCorreoCampo);
router.get('/documentos-firma/:id/pdf-firmado', validateToken, generarPdfFirmado);

// ========================================
// INSPECCIONES Y RIESGOS
// ========================================

// Inspecciones CRUD
router.post('/inspecciones', validateToken, crearInspeccion);
router.get('/inspecciones', validateToken, obtenerInspecciones);
router.put('/inspecciones/:id', validateToken, actualizarInspeccion);
router.delete('/inspecciones/:id', validateToken, eliminarInspeccion);
router.post('/inspecciones/:id/checklist', validateToken, guardarChecklist);

// Condiciones Inseguras
router.post('/condiciones-inseguras', validateToken, crearCondicionInsegura);
router.get('/condiciones-inseguras', validateToken, obtenerCondicionesInseguras);
router.put('/condiciones-inseguras/:id', validateToken, actualizarCondicionInsegura);
router.delete('/condiciones-inseguras/:id', validateToken, eliminarCondicionInsegura);
router.post('/condiciones-inseguras/:id/foto', validateToken, upload.single('foto'), subirFotoCondicion);

// Matriz de Riesgos
router.post('/riesgos', validateToken, crearRiesgo);
router.get('/riesgos', validateToken, obtenerRiesgos);
router.put('/riesgos/:id', validateToken, actualizarRiesgo);
router.delete('/riesgos/:id', validateToken, eliminarRiesgo);
router.post('/riesgos/:id/archivo', validateToken, upload.single('archivo'), subirArchivoRiesgo);

// Planes de Acción
router.post('/planes-accion', validateToken, crearPlanAccion);
router.get('/planes-accion', validateToken, obtenerPlanesAccion);
router.put('/planes-accion/:id', validateToken, actualizarPlanAccion);
router.delete('/planes-accion/:id', validateToken, eliminarPlanAccion);

// ========================================
// CAPACITACIONES SST
// ========================================

router.post('/capacitaciones', validateToken, crearCapacitacion);
router.get('/capacitaciones', validateToken, obtenerCapacitaciones);
router.put('/capacitaciones/:id', validateToken, actualizarCapacitacion);
router.delete('/capacitaciones/:id', validateToken, eliminarCapacitacion);
router.post('/capacitaciones/:id/material', validateToken, upload.single('material'), subirMaterial);
router.post('/capacitaciones/:id/evaluacion', validateToken, crearEvaluacion);
router.get('/capacitaciones/:id/evaluacion', validateToken, obtenerEvaluacion);
router.post('/capacitaciones/:id/evaluacion/responder', validateToken, responderEvaluacion);
router.get('/capacitaciones/:id/evaluacion/resultados', validateToken, obtenerResultados);

export default router;
