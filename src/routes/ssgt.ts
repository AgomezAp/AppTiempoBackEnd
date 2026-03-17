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
  obtenerInspeccionPorId,
  actualizarInspeccion,
  eliminarInspeccion,
  guardarRespuestas,
  completarInspeccion,
  crearCondicionInsegura,
  obtenerCondicionesInseguras,
  actualizarCondicionInsegura,
  eliminarCondicionInsegura,
  subirFotoCondicion,
} from '../controllers/ssgtInspecciones';
import {
  crearPlantilla,
  obtenerPlantillas,
  obtenerPlantillaPorId,
  actualizarPlantilla,
  eliminarPlantilla,
  duplicarPlantilla,
} from '../controllers/ssgtPlantillas';
import {
  crearAccionCorrectiva,
  obtenerAccionesCorrectivas,
  actualizarAccionCorrectiva,
  eliminarAccionCorrectiva,
  subirEvidenciaAccion,
} from '../controllers/ssgtAccionesCorrectivas';
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
router.get('/documentos-firma/:id/paginas/:num', obtenerPaginaImagen);
router.post('/documentos-firma/:id/campos', validateToken, guardarCamposFirma);
router.put('/documentos-firma/:id/enviar', validateToken, enviarParaFirmar);
router.post('/documentos-firma/:id/campos/:campoId/reenviar', validateToken, reenviarCorreoCampo);
router.get('/documentos-firma/:id/pdf-firmado', validateToken, generarPdfFirmado);

// ========================================
// PLANTILLAS DE INSPECCIÓN
// ========================================

router.post('/plantillas', validateToken, crearPlantilla);
router.get('/plantillas', validateToken, obtenerPlantillas);
router.get('/plantillas/:id', validateToken, obtenerPlantillaPorId);
router.put('/plantillas/:id', validateToken, actualizarPlantilla);
router.delete('/plantillas/:id', validateToken, eliminarPlantilla);
router.post('/plantillas/:id/duplicar', validateToken, duplicarPlantilla);

// ========================================
// INSPECCIONES (SafetyCulture)
// ========================================

// Inspecciones CRUD
router.post('/inspecciones', validateToken, crearInspeccion);
router.get('/inspecciones', validateToken, obtenerInspecciones);
router.get('/inspecciones/:id', validateToken, obtenerInspeccionPorId);
router.put('/inspecciones/:id', validateToken, actualizarInspeccion);
router.delete('/inspecciones/:id', validateToken, eliminarInspeccion);
router.post('/inspecciones/:id/respuestas', validateToken, guardarRespuestas);
router.post('/inspecciones/:id/respuestas/foto', validateToken, upload.single('foto'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No se envió ningún archivo' });
    }
    const rutaArchivo = `/uploads/ssgt/${req.file.filename}`;
    return res.json({ msg: 'Foto subida correctamente', ruta: rutaArchivo });
  } catch (error) {
    console.error('Error al subir foto de inspección:', error);
    return res.status(500).json({ msg: 'Error al subir la foto' });
  }
});
router.post('/inspecciones/:id/completar', validateToken, completarInspeccion);

// PDF de inspección
router.get('/inspecciones/:id/pdf', validateToken, async (req: any, res: any) => {
  try {
    const { parseId } = await import('../utils/parseId');
    const { InspeccionSSGT, PlantillaInspeccion, SeccionPlantilla, PreguntaPlantilla, RespuestaInspeccion, AccionCorrectivaInspeccion } = await import('../models/ssgt');
    const { User } = await import('../models/user');
    const { generarPdfInspeccion } = await import('../services/inspeccionPdf');

    const id = parseId(req.params.id);
    const inspeccion = await InspeccionSSGT.findByPk(id, {
      include: [
        {
          model: PlantillaInspeccion,
          as: 'plantilla',
        },
        {
          model: RespuestaInspeccion,
          as: 'respuestas',
          include: [
            { model: PreguntaPlantilla, as: 'pregunta' },
            { model: SeccionPlantilla, as: 'seccion' },
          ],
        },
        {
          model: AccionCorrectivaInspeccion,
          as: 'acciones',
          include: [{ model: User, as: 'responsable', attributes: ['Uid', 'name', 'lastName'] }],
        },
        {
          model: User,
          as: 'inspector',
          attributes: ['Uid', 'name', 'lastName'],
        },
      ],
    });

    if (!inspeccion) {
      res.status(404).json({ msg: 'Inspección no encontrada' });
      return;
    }

    const pdfBuffer = await generarPdfInspeccion(inspeccion.toJSON());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=inspeccion_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ msg: 'Error al generar el PDF' });
  }
});

// Condiciones Inseguras
router.post('/condiciones-inseguras', validateToken, crearCondicionInsegura);
router.get('/condiciones-inseguras', validateToken, obtenerCondicionesInseguras);
router.put('/condiciones-inseguras/:id', validateToken, actualizarCondicionInsegura);
router.delete('/condiciones-inseguras/:id', validateToken, eliminarCondicionInsegura);
router.post('/condiciones-inseguras/:id/foto', validateToken, upload.single('foto'), subirFotoCondicion);

// ========================================
// ACCIONES CORRECTIVAS
// ========================================

router.post('/acciones-correctivas', validateToken, crearAccionCorrectiva);
router.get('/acciones-correctivas', validateToken, obtenerAccionesCorrectivas);
router.put('/acciones-correctivas/:id', validateToken, actualizarAccionCorrectiva);
router.delete('/acciones-correctivas/:id', validateToken, eliminarAccionCorrectiva);
router.post('/acciones-correctivas/:id/evidencia', validateToken, upload.single('evidencia'), subirEvidenciaAccion);

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
