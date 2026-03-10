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

const router = Router();

const upload = multer({
  dest: 'uploads/ssgt/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

export default router;
