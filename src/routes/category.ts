import { Router } from 'express';

import {
  actualizarRol,
  borrarRol,
  crearRol,
  leerRole,
  leerRoleId,
} from '../controllers/role';

const router = Router();
/* 
router.get("/api/categoria/traer",leerCategoria);
router.get("/api/categoria/traerId/:Cid",leerCategoriaId);
router.post("/api/categoria/crear",crearCategoria);
router.patch("/api/categoria/actualizar/:Cid",actualizarCategoria);
router.delete("/api/categoria/borrar/:Cid",borrarCategoria); */

//RUTAS DE ROL 

router.get("/api/rol/lectura",leerRole);

router.get("/api/rol/lecturaId/:Rid",leerRoleId);

router.post("/api/rol/crearRol",crearRol);

router.patch("/api/rol/actualizar/:Rid",actualizarRol);

router.delete("/api/rol/eliminarRol/:Rid",borrarRol);

export default router