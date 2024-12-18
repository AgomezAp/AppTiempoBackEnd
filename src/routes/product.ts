import { Router } from 'express';

import {
  deleteProductById,
  getInventario,
  getProductById,
  registerProduct,
  updateProductById,
} from '../controllers/product';
import validateToken from './validateToken';

const router = Router();

// Ruta para registrar un nuevo producto
router.post("/api/product/register",validateToken ,registerProduct);

// Ruta para obtener todo el inventario (requiere validación de token)
router.get("/api/product/ObtenerInventario",validateToken, getInventario);

// Ruta para obtener un producto por ID
router.get("/api/product/obtener/:id", validateToken,getProductById);

// Ruta para borrar un producto por ID
router.delete("/api/product/delete/:id",validateToken ,deleteProductById);

// Ruta para actualizar un producto por ID
router.patch("/api/product/actualizar/:id",validateToken, updateProductById);

export default router;
