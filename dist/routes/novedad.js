"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const novedad_1 = require("../controllers/novedad");
const router = (0, express_1.Router)();
// Ruta para agregar novedad
router.post("/api/novedad/NuevaNovedad", novedad_1.convertNovedad);
// Ruta para ver novedades 
router.get("/api/novedad/ObtenerNovedad", novedad_1.getNovedad);
// eliminar novedades
router.delete("/api/novedad/eliminarNovedad", novedad_1.deleteNovedad);
// editar horas novedad
router.put("/api/novedad/editarNovedadHora", novedad_1.updateNovedadHora);
//editar estado novedad
router.put("/api/novedad/editarNovedadEstado", novedad_1.updateNovedadEstado);
// aceptar todas las novedades
router.post("/api/novedad/aceptacion", novedad_1.aceptarTodo);
exports.default = router;
