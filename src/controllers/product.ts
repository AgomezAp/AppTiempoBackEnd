import {
  Request,
  Response,
} from 'express';

import { Product } from '../models/product';

export const registerProduct = async( req:Request, res: Response): Promise<any> =>{
  try {
        // Aquí debes realizar la operación que puede fallar, como agregar el producto.
        const producto = await Product.create({
          name: req.body.name,
          brand: req.body.brand,
          category:req.body.category,
          price:req.body.price,
          quantity:req.body.quantity,
          status: 1,
        });
      
        // Si la operación fue exitosa, devolveremos el mensaje de éxito.
        res.status(200).json({
          message: "Producto añadido con éxito",
          producto, // Aquí puedes devolver el producto creado si lo deseas
        });
      
      } catch (err:any) {
        // Si ocurrió un error, devolvemos el error y el mensaje
        console.error(err); // Esto es útil para depurar el error en consola
      
        res.status(500).json({
          error: "Problemas al agregar el producto",
          message: err.message || err, // Aquí se agrega el mensaje del error para mayor claridad
        });
      }
};
export const getInventario = async (req:Request, res:Response): Promise<any>=>{
    const listaInventario = await Product.findAll();
    res.json(listaInventario)
}

export const getProductById = async (req: Request, res: Response): Promise<any>=> {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        message: `Producto con ID ${id} no encontrado`,
      });
    }

    res.status(200).json({
      message: `Producto con ID ${id} encontrado`,
      product,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: `Error al obtener el producto con ID ${id}`,
      error: error.message || error,
    });
  }
};
export const deleteProductById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        message: `Producto con ID ${id} no encontrado`,
      });
    }

    await Product.destroy({ where: { id } });

    res.status(200).json({
      message: `Producto con ID ${id} eliminado exitosamente`,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: `Error al eliminar el producto con ID ${id}`,
      error: error.message || error,
    });
  }
};
export const updateProductById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name, category, brand,price, quantity,status } = req.body;

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        message: `Producto con ID ${id} no encontrado`,
      });
    }

    await Product.update(
      { name:name, brand:brand,category:category, price:price, quantity:quantity },
      { where: { id } }
    );

    res.status(200).json({
      message: `Producto con ID ${id} actualizado exitosamente`,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: `Error al actualizar el producto con ID ${id}`,
      error: error.message || error,
    });
  }
};
