import { Router } from 'express';
import { getAlerts, triggerGenerateAlerts, deleteAllAlerts } from '../controllers/adminAlerts';
import { getAusentismoStats, getAusentismoSummary } from '../controllers/ausentismoStats';
import { validateAdmin } from '../controllers/archivo';

const router = Router();

// List stored alerts (admin only)
router.get('/alerts', validateAdmin, getAlerts);

// Manual trigger for generating alerts (admin only) - for testing
router.post('/alerts/generate', validateAdmin, triggerGenerateAlerts);

// Delete all alerts (admin only) - for testing
router.delete('/alerts/all', validateAdmin, deleteAllAlerts);

// Get detailed ausentismo statistics (from NovedadHistorico)
router.get('/ausentismo/stats', validateAdmin, getAusentismoStats);

// Get summary statistics for KPI cards
router.get('/ausentismo/summary', validateAdmin, getAusentismoSummary);

export default router;
