import {
  Request,
  Response,
} from 'express';

import { Role } from '../models/role';

export const leerRole = async(req:Request, res:Response):Promise<any>=>{
    try{
        const listRole = await Role.findAll();
        res.status(200).json(listRole)
    }catch(error){
        res.status(500).json({
            msg:`Error al obtener las categorías`
        });
    }
}

export const leerRoleId = async (req:Request, res:Response):Promise<any> =>{
    const {Rid} = req.params;
    try{
        const role = await Role.findOne({where:{Rid:Rid}})
        if(!role){
            return res.status(404).json({
                msg:`El rol con el id ${Rid} no fue encontrado`
            });
        }
        return res.json({
            msg:`Rol con Id${Rid} encontrado exitosamente`,
            data: role
        })
    }catch(error){ 
        return res.status(500).json({
            msg:`Error al buscar el rol con el Id ${Rid}`
        })
    }
}

export const crearRol = async (req:Request, res:Response):Promise<any> =>{
    const {Rname}= req.body

    const rol : any = await Role.findOne({where:{Rname:Rname}})
    if(rol){
        return res.status(400).json({
            msg:`Rol ${Rname},ya existe`
        })
    }
    try{
        Role.create({
            Rname:Rname,
            Rstatus:1
        })
        return res.json({
            msg:`El rol ${Rname} ha sido creado con exito `
        })
    }catch(error){
        return res.json({
            msg:`Erorr al crear el rol ${Rname}`
        })
    }
}

export const actualizarRol = async (req:Request, res:Response):Promise<any> =>{
    const {Rname} = req.body
    const {Rid} = req.params
    try{
        const role :any = await Role.findOne({where:{Rid:Rid}});
        if (!role){
            return res.status(404).json({
                msg:`El rol ${Rname} no ha sido encontrado`
            })

        }
        await Role.update(
            {
                Rname:Rname
            },
            {where:{Rid:Rid}}
        );
        return res.json({
            msg:`Rol ${Rname} actualizado exitosamente`

        });

    }catch(error){
        return res.status(500).json({
            
            msg:`Error al actualizar el rol`
        })
    }
};

export const borrarRol = async (req: Request, res:Response):Promise<any> =>{
    const {Rid} = req.params

    try{
        const role: any = await Role.findOne({where:{Rid:Rid}});
        if(!role){
            return res.status(404).json({ msg:`Rol con Id ${Rid} no existe`});
        }
        await Role.destroy({where:{Rid:Rid}});
        return res.json({
            msg:`El rol con Id ${Rid} ha sido eliminado exitosamente`
        });
    }catch(error){
        return res.status(500).json({
            msg:`Error al eliminar el rol con Id ${Rid}`
        })
    }
}