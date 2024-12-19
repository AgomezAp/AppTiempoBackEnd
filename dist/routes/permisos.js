"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permisos_1 = require("../controllers/permisos");
const router = (0, express_1.Router)();
router.post('/api/permisos/crear', permisos_1.createPermiso);
router.get('/api/permisos/:id', permisos_1.getPermisosByUserId);
router.get('/api/admin/users', permisos_1.getAllUsersWithPermisos);
exports.default = router;
