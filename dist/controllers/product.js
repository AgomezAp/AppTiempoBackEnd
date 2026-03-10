"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductById = exports.deleteProductById = exports.getProductById = exports.getInventario = exports.registerProduct = void 0;
const parseId_1 = require("../utils/parseId");
const product_1 = require("../models/product");
const registerProduct = async (req, res) => {
    try {
        // Aquí debes realizar la operación que puede fallar, como agregar el producto.
        const producto = await product_1.Product.create({
            name: req.body.name,
            brand: req.body.brand,
            category: req.body.category,
            quantity: req.body.quantity,
            status: 1,
            qrCode: req.body.qrCode
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
};
exports.registerProduct = registerProduct;
const getInventario = async (req, res) => {
    const listaInventario = await product_1.Product.findAll();
    res.json(listaInventario);
};
exports.getInventario = getInventario;
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await product_1.Product.findByPk((0, parseId_1.parseId)(id));
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
};
exports.getProductById = getProductById;
const deleteProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await product_1.Product.findByPk((0, parseId_1.parseId)(id));
        if (!product) {
            return res.status(404).json({
                message: `Producto con ID ${id} no encontrado`,
            });
        }
        await product_1.Product.destroy({ where: { id } });
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
};
exports.deleteProductById = deleteProductById;
const updateProductById = async (req, res) => {
    const { id } = req.params;
    const { name, category, brand, price, quantity, status } = req.body;
    try {
        const product = await product_1.Product.findByPk((0, parseId_1.parseId)(id));
        if (!product) {
            return res.status(404).json({
                message: `Producto con ID ${id} no encontrado`,
            });
        }
        await product_1.Product.update({ name: name, brand: brand, category: category, price: price, quantity: quantity }, { where: { id } });
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
};
exports.updateProductById = updateProductById;
