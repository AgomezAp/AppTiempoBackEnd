import { Router } from "express";

import {
  createArea,
  deleteArea,
  getAllAreas,
  getAreaById,
  updateArea,
} from "../controllers/area";

const router = Router();

router.get("/api/area/traerAreas", getAllAreas);
router.get("/api/area/areaId/:Aid", getAreaById);
router.post("/api/area/nuevaArea", createArea);
router.patch("/api/area/actualizarArea/:Aid", updateArea);
router.delete("/api/area/BorrarArea/:Aid", deleteArea);

export default router;
