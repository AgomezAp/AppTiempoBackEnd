import { Router } from 'express';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/room';
import verifyToken from '../routes/validateToken';

const router = Router();

router.get('/api/rooms', getAllRooms);
router.get('/api/rooms/:id', getRoomById);
router.post('/api/rooms', verifyToken, createRoom);
router.patch('/api/rooms/:id', verifyToken, updateRoom);
router.delete('/api/rooms/:id', verifyToken, deleteRoom);

export default router;
