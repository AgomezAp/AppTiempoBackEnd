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

// Rutas públicas (para que los usuarios puedan firmar sin login)
router.get('/firmar/:token', obtenerInfoFirma);
router.post('/firmar/:token', firmarAsistencia);

export default router;
