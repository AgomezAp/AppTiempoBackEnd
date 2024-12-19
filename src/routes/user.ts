import { Router } from 'express';

import {
  deleteUserById,
  getAllUsers,
  login,
  register,
  resetPassword,
} from '../controllers/user';

const router = Router();

router.post("/api/user/register",register);
router.post("/api/user/login",login)
router.patch('/api/user/reset-password', resetPassword);
router.get('/api/user/update', getAllUsers);
router.delete('/api/user/delete', deleteUserById);

export default router