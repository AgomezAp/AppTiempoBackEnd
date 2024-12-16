"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_1 = require("../controllers/role");
const router = (0, express_1.Router)();
/*
router.get("/api/categoria/traer",leerCategoria);
router.get("/api/categoria/traerId/:Cid",leerCategoriaId);
router.post("/api/categoria/crear",crearCategoria);
router.patch("/api/categoria/actualizar/:Cid",actualizarCategoria);
router.delete("/api/categoria/borrar/:Cid",borrarCategoria); */
//RUTAS DE ROL 
router.get("/api/rol/lectura", role_1.leerRole);
router.get("/api/rol/lecturaId/:Rid", role_1.leerRoleId);
router.post("/api/rol/crearRol", role_1.crearRol);
router.patch("/api/rol/actualizar/:Rid", role_1.actualizarRol);
router.delete("/api/rol/eliminarRol/:Rid", role_1.borrarRol);
exports.default = router;
