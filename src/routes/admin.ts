import { Router } from 'express';
import { getAlerts, triggerGenerateAlerts, deleteAllAlerts } from '../controllers/adminAlerts';
import { getAusentismoStats, getAusentismoSummary, getPermisosTypes, togglePermisoCancelado } from '../controllers/ausentismoStats';
import { validateAdmin } from '../controllers/archivo';

const router = Router();

// List stored alerts (admin only)
router.get('/alerts', validateAdmin, getAlerts);

// Manual trigger for generating alerts (admin only) - for testing
router.post('/alerts/generate', validateAdmin, triggerGenerateAlerts);

// Delete all alerts (admin only) - for testing
router.delete('/alerts/all', validateAdmin, deleteAllAlerts);

// DEBUG: Ver tipos de permisos en BD
router.get('/ausentismo/debug/tipos', getPermisosTypes);

// DEBUG: Test stats sin auth (REMOVER EN PRODUCCIÓN)
router.get('/ausentismo/debug/stats', getAusentismoStats);

// DEBUG: Test toggle sin auth (REMOVER EN PRODUCCIÓN)
router.patch('/ausentismo/debug/permiso/:id/toggle-cancelado', togglePermisoCancelado);

// Toggle cancelado de un permiso (marcar como no tomado)
router.patch('/ausentismo/permiso/:id/toggle-cancelado', validateAdmin, togglePermisoCancelado);

// Get detailed ausentismo statistics
router.get('/ausentismo/stats', validateAdmin, getAusentismoStats);

// Get summary statistics for KPI cards
router.get('/ausentismo/summary', validateAdmin, getAusentismoSummary);

export default router;
