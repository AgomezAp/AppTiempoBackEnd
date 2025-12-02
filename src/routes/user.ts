import { Router } from 'express';

import {
  deleteUserById,
  getAllUsers,
  login,
  register,
  resetPassword,
  getListUser,
  updateUser,
  searchUsers
} from '../controllers/user';

const router = Router();

router.post("/api/user/register",register);
router.post("/api/user/login",login)
router.patch('/api/user/reset-password', resetPassword);
router.get('/api/user/AllUsers', getAllUsers);
router.get('/api/user/ListUsers',getListUser)
router.get('/api/user/search', searchUsers);
router.delete('/api/user/delete/:Uid', deleteUserById);
router.put("/api/user/editarUsuario/:Uid", updateUser);
export default router