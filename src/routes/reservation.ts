import { Router } from 'express';
import {
  createReservation,
  getAllReservations,
  getUserReservations,
  updateReservation,
  cancelReservation,
  getAvailableSlots,
} from '../controllers/reservation';
import verifyToken from '../routes/validateToken';

const router = Router();

router.get('/api/reservations/available-slots', getAvailableSlots);
router.get('/api/reservations', getAllReservations);
router.get('/api/reservations/my-reservations', verifyToken, getUserReservations);
router.post('/api/reservations', verifyToken, createReservation);
router.patch('/api/reservations/:id', verifyToken, updateReservation);
router.delete('/api/reservations/:id', verifyToken, cancelReservation);

export default router;
