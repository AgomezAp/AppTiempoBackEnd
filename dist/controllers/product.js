"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductById = exports.deleteProductById = exports.getProductById = exports.getInventario = exports.registerProduct = void 0;
const product_1 = require("../models/product");
const registerProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Aquí debes realizar la operación que puede fallar, como agregar el producto.
        const producto = yield product_1.Product.create({
            name: req.body.name,
            brand: req.body.brand,
            category: req.body.category,
            quantity: req.body.quantity,
            status: 1,
            estado: req.body.estado,
            qrCode: req.body.qrCode,
        });
        // Si la operación fue exitosa, devolveremos el mensaje de éxito.
        res.status(200).json({
            message: "Producto añadido con éxito",
            producto, // Aquí puedes devolver el producto creado si lo deseas
        });
    }
    catch (err) {
        // Si ocurrió un error, devolvemos el error y el mensaje
        console.error(err); // Esto es útil para depurar el error en consola
        res.status(500).json({
            error: "Problemas al agregar el producto",
            message: err.message || err, // Aquí se agrega el mensaje del error para mayor claridad
        });
    }
});
exports.registerProduct = registerProduct;
const getInventario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const listaInventario = yield product_1.Product.findAll();
    res.json(listaInventario);
});
exports.getInventario = getInventario;
/**
 * Obtiene un producto por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 */
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const product = yield product_1.Product.findByPk(id);
        if (!product) {
            return res.status(404).json({
                message: `Producto con ID ${id} no encontrado`,
            });
        }
        res.status(200).json({
            message: `Producto con ID ${id} encontrado`,
            product,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error al obtener el producto con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.getProductById = getProductById;
/**
 * Elimina un producto por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 */
const deleteProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const product = yield product_1.Product.findByPk(id);
        if (!product) {
            return res.status(404).json({
                message: `Producto con ID ${id} no encontrado`,
            });
        }
        yield product_1.Product.destroy({ where: { id } });
        res.status(200).json({
            message: `Producto con ID ${id} eliminado exitosamente`,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error al eliminar el producto con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.deleteProductById = deleteProductById;
/**
 * Actualiza un producto por su ID.
 *
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<any>} - Una promesa que resuelve con la respuesta HTTP.
 */
const updateProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, category, brand, price, quantity, estado } = req.body;
    try {
        const product = yield product_1.Product.findByPk(id);
        if (!product) {
            return res.status(404).json({
                message: `Producto con ID ${id} no encontrado`,
            });
        }
        yield product_1.Product.update({ name: name, brand: brand, category: category, price: price, quantity: quantity, estado: estado }, { where: { id } });
        res.status(200).json({
            message: `Producto con ID ${id} actualizado exitosamente`,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error al actualizar el producto con ID ${id}`,
            error: error.message || error,
        });
    }
});
exports.updateProductById = updateProductById;
