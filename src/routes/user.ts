import { Router } from 'express';

import {
  login,
  register,
  resetPassword,
} from '../controllers/user';

const router = Router();

router.post("/api/user/register",register);
router.post("/api/user/login",login)
router.patch('/api/user/reset-password', resetPassword);
export default router