import { Router } from 'express';
import {
  crearRegistroAsistencia,
  obtenerInfoFirma,
  firmarAsistencia,
  obtenerRegistros,
  obtenerRegistroPorId,
  generarPDF,
  reenviarCorreoFirma,
  eliminarRegistro,
  cancelarTokenFirma,
  anularFirma,
} from '../controllers/asistencia';
import validateToken from './validateToken';

const router = Router();

// Rutas protegidas (requieren autenticación)
router.post('/crear', validateToken, crearRegistroAsistencia);
router.get('/lista', validateToken, obtenerRegistros);
router.get('/detalle/:id', validateToken, obtenerRegistroPorId);
router.get('/pdf/:id', validateToken, generarPDF);
router.post('/reenviar/:participanteId', validateToken, reenviarCorreoFirma);
router.delete('/eliminar/:id', validateToken, eliminarRegistro);
router.post('/cancelar-token/:participanteId', validateToken, cancelarTokenFirma);
router.post('/anular-firma/:participanteId', validateToken, anularFirma);

// Rutas públicas (para que los usuarios puedan firmar sin login)
router.get('/firmar/:token', obtenerInfoFirma);
router.post('/firmar/:token', firmarAsistencia);

export default router;
