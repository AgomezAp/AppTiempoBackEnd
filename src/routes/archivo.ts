import { Router } from "express";
import {
  getArchivos,
  getArchivosPorCategoria,
  getArchivo,
  createArchivo,
  updateArchivo,
  deleteArchivo,
  deleteArchivoFisico,
  validateAdmin,
  upload,
} from "../controllers/archivo";
import validateToken from "./validateToken";

const router = Router();

// Rutas públicas (requieren solo autenticación)
router.get("/", validateToken, getArchivos);
router.get("/categoria/:categoria", validateToken, getArchivosPorCategoria);
router.get("/:id", validateToken, getArchivo);

// Rutas protegidas (requieren ser administrador)
router.post("/", validateToken, validateAdmin, upload.single("file"), createArchivo);
router.put("/:id", validateToken, validateAdmin, upload.single("file"), updateArchivo);
router.delete("/:id", validateToken, validateAdmin, deleteArchivo);
router.delete("/fisico/:id", validateToken, validateAdmin, deleteArchivoFisico);

export default router;
