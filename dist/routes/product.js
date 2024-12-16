"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_1 = require("../controllers/product");
const validateToken_1 = __importDefault(require("./validateToken"));
const router = (0, express_1.Router)();
// Ruta para registrar un nuevo producto
router.post("/api/product/register", product_1.registerProduct);
// Ruta para obtener todo el inventario (requiere validación de token)
router.get("/api/product/ObtenerInventario", validateToken_1.default, product_1.getInventario);
// Ruta para obtener un producto por ID
router.get("/api/product/obtener/:id", product_1.getProductById);
// Ruta para borrar un producto por ID
router.delete("/api/product/delete/:id", product_1.deleteProductById);
// Ruta para actualizar un producto por ID
router.patch("/api/product/actualizar/:id", product_1.updateProductById);
exports.default = router;
