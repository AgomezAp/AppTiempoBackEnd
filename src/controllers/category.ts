/* import {
  Request,
  Response,
} from 'express';

import { Category } from '../models/category';

export const leerCategoria = async (req:Request, res:Response): Promise<any> =>{
    try {
        const listCategory = await Category.findAll(); // Aquí no se pasa ningún argumento
        res.status(200).json(listCategory);
      } catch (error) {
        console.error(error);
        res.status(500).json({
            msg:`Error al obtener las categorías`
        });
      }
}

export const leerCategoriaId = async (req:Request, res:Response): Promise<any> =>{
    const {Cid}  = req.params;
    try{
        const category = await Category.findOne({where:{Cid:Cid}})

        if(!category){
            return res.status(404).json({
                msg:`Categoría con Id${Cid} no encontrada`
            });
        }
        return res.json({
            msg:`Categoría con Id ${Cid} encontrada exitosamente`,
            data:category
        });
    }catch(error){
        return res.status(500).json({
            msg:`Error al buscar la categoría con Id ${Cid}`
        })
    }
}

export const crearCategoria = async (req:Request,res:Response): Promise<any> =>{
    const {Cname,Cdescription} = req.body

    const category :any  =await Category.findOne({where :{Cname:Cname}})

    if(category){
        return res.status(400).json({
            msg:`Categoría ${Cname}, ya existe`
        })
    }
    try{
        Category.create({
            Cname:Cname,
            Cdescription:Cdescription,
            Cstatus:1
        })
        return res.json({
            msg:`Categoría ${Cname}, creada exitosamente`
        })
    }catch(error){
        return res.json({
            msg:`Error al crear la categoría ${Cname}`
        })
    }
}

export const actualizarCategoria = async(req:Request, res:Response):Promise<any> => {
    const {Cid} = req.params;
    const {Cname,Cdescription} = req.body

    try{
        const category: any = await Category.findOne({where:{Cid:Cid}});
        if(!category){
            return res.status(400).json({
                msg:`La categoría ${Cname} no ha sido encontrada`
            });
        }

        await Category.update(
            {
                Cname:Cname,
                Cdescription:Cdescription,
            },
            {where:{Cid:Cid}}
        );
        return res.json({
            msg:`Categoría ${Cname} actualizada exitosamente`
        });
    }catch(error){
        return res.status(500).json({
            msg:`Error al actualizar la categoría ${Cname}`
        })
    }
}


export const borrarCategoria = async (req:Request,res:Response):Promise<any> =>{
    const {Cid} = req.params;
    try{
        const category:any = await Category.findOne({where:{Cid:Cid}});

        if(!category){
            return res.status(400).json({
                msg:`Categoría con Id ${Cid} no encontrada`
            });
        }

        await Category.destroy({where:{Cid:Cid}})
        return res.json({
            msg:`Categoría con ID ${Cid} eliminada exitosamente`
        })
    }catch(error){
        return res.status(500).json({
            msg:`Error al eliminar la categoría con Id ${Cid}`
        })
    }
} */