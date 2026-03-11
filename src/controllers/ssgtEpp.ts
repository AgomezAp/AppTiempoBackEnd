import { Request, Response } from 'express';
import crypto from 'crypto';
import { Op } from 'sequelize';
import {
  CatalogoEPP,
  EntregaEPP,
  DetalleEntregaEPP,
  FirmaEntregaEPP,
  AlertaEPP,
} from '../models/ssgt';
import { User } from '../models/user';
import { parseId } from '../utils/parseId';
import { sendEntregaEppEmail } from '../utils/mailer';
import { generarEntregaEppPDF } from '../services/eppPdf';

// ========================================
// CATALOGO EPP CRUD
// ========================================

export const crearEPP = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      nombre, descripcion, categoria, stockActual,
      stockMinimo, fechaVencimiento, proveedor, imagen,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({
        msg: 'El campo nombre es requerido',
      });
    }

    const epp = await CatalogoEPP.create({
      nombre, descripcion, categoria, stockActual,
      stockMinimo, fechaVencimiento, proveedor, imagen,
    });

    return res.status(201).json({ msg: 'EPP creado exitosamente', epp });
  } catch (error) {
    console.error('Error al crear EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const obtenerEPPs = async (req: Request, res: Response): Promise<any> => {
  try {
    const { activo, categoria } = req.query;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo === 'true';
    } else {
      where.activo = true;
    }

    if (categoria) where.categoria = categoria;

    const epps = await CatalogoEPP.findAll({
      where,
      include: [
        { model: AlertaEPP, as: 'alertas' },
      ],
      order: [['nombre', 'ASC']],
    });

    return res.json(epps);
  } catch (error) {
    console.error('Error al obtener EPPs:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const actualizarEPP = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const epp = await CatalogoEPP.findByPk(id);

    if (!epp) {
      return res.status(404).json({ msg: 'EPP no encontrado' });
    }

    const {
      nombre, descripcion, categoria, stockActual,
      stockMinimo, fechaVencimiento, proveedor, imagen,
    } = req.body;

    await epp.update({
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(categoria !== undefined && { categoria }),
      ...(stockActual !== undefined && { stockActual }),
      ...(stockMinimo !== undefined && { stockMinimo }),
      ...(fechaVencimiento !== undefined && { fechaVencimiento }),
      ...(proveedor !== undefined && { proveedor }),
      ...(imagen !== undefined && { imagen }),
    });

    return res.json({ msg: 'EPP actualizado exitosamente', epp });
  } catch (error) {
    console.error('Error al actualizar EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const eliminarEPP = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const epp = await CatalogoEPP.findByPk(id);

    if (!epp) {
      return res.status(404).json({ msg: 'EPP no encontrado' });
    }

    await epp.update({ activo: false });

    return res.json({ msg: 'EPP eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// ENTREGAS
// ========================================

export const crearEntrega = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fecha, empresa, observaciones, creadoPor, items, firmantes } = req.body;

    if (!fecha || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        msg: 'Los campos fecha e items (array no vacío) son requeridos',
      });
    }

    if (!firmantes || !Array.isArray(firmantes) || firmantes.length === 0) {
      return res.status(400).json({
        msg: 'El campo firmantes (array no vacío) es requerido',
      });
    }

    // 1. Crear la entrega
    const entrega = await EntregaEPP.create({
      fecha, empresa, observaciones, creadoPor,
      estado: 'pendiente',
    });

    // 2. Crear detalles y actualizar stock
    for (const item of items) {
      await DetalleEntregaEPP.create({
        entregaId: entrega.id,
        eppId: item.eppId,
        cantidad: item.cantidad,
        talla: item.talla,
      });

      // Decrementar stock
      const eppCatalogo = await CatalogoEPP.findByPk(item.eppId);
      if (eppCatalogo) {
        await eppCatalogo.update({
          stockActual: eppCatalogo.stockActual - item.cantidad,
        });

        // Verificar stock bajo y crear alerta si corresponde
        if (eppCatalogo.stockActual < eppCatalogo.stockMinimo) {
          await AlertaEPP.create({
            eppId: eppCatalogo.id,
            tipo: 'stock_bajo',
            mensaje: `Stock bajo para "${eppCatalogo.nombre}": ${eppCatalogo.stockActual} unidades (mínimo: ${eppCatalogo.stockMinimo})`,
          });
        }
      }
    }

    // 3. Crear firmas con tokens
    const firmasCreadas = [];
    for (const firmante of firmantes) {
      const tokenFirma = crypto.randomBytes(32).toString('hex');
      const firma = await FirmaEntregaEPP.create({
        entregaId: entrega.id,
        tipo: firmante.tipo,
        esExterno: firmante.esExterno,
        usuarioId: firmante.usuarioId,
        nombreCompleto: firmante.nombreCompleto,
        email: firmante.email,
        tokenFirma,
      });
      firmasCreadas.push({ firma, tokenFirma });
    }

    // 4. Enviar correos de firma
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    for (const { firma, tokenFirma } of firmasCreadas) {
      const enlaceFirma = `${frontendUrl}/firmar-epp/${tokenFirma}`;
      try {
        await sendEntregaEppEmail(
          firma.email,
          firma.nombreCompleto,
          {
            fecha: entrega.fecha,
            empresa: entrega.empresa || '',
            tipoFirma: firma.tipo,
            enlaceFirma,
          }
        );
      } catch (emailError) {
        console.error('Error al enviar correo de firma EPP:', emailError);
      }
    }

    // 5. Obtener entrega completa con includes
    const entregaCompleta = await EntregaEPP.findByPk(entrega.id, {
      include: [
        {
          model: DetalleEntregaEPP,
          as: 'detalles',
          include: [{ model: CatalogoEPP, as: 'epp' }],
        },
        { model: FirmaEntregaEPP, as: 'firmas' },
        { model: User, as: 'creador', attributes: ['Uid', 'name', 'lastName'] },
      ],
    });

    return res.status(201).json({ msg: 'Entrega creada exitosamente', entrega: entregaCompleta });
  } catch (error) {
    console.error('Error al crear entrega EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const obtenerEntregas = async (req: Request, res: Response): Promise<any> => {
  try {
    const { empresa, estado } = req.query;

    const where: any = {};
    if (empresa) where.empresa = empresa;
    if (estado) where.estado = estado;

    const entregas = await EntregaEPP.findAll({
      where,
      include: [
        {
          model: DetalleEntregaEPP,
          as: 'detalles',
          include: [{ model: CatalogoEPP, as: 'epp' }],
        },
        { model: FirmaEntregaEPP, as: 'firmas' },
        { model: User, as: 'creador', attributes: ['Uid', 'name', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json(entregas);
  } catch (error) {
    console.error('Error al obtener entregas EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const obtenerEntregaPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);

    const entrega = await EntregaEPP.findByPk(id, {
      include: [
        {
          model: DetalleEntregaEPP,
          as: 'detalles',
          include: [{ model: CatalogoEPP, as: 'epp' }],
        },
        {
          model: FirmaEntregaEPP,
          as: 'firmas',
          include: [{ model: User, as: 'usuario' }],
        },
        { model: User, as: 'creador', attributes: ['Uid', 'name', 'lastName'] },
      ],
    });

    if (!entrega) {
      return res.status(404).json({ msg: 'Entrega no encontrada' });
    }

    return res.json(entrega);
  } catch (error) {
    console.error('Error al obtener entrega EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const eliminarEntrega = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const entrega = await EntregaEPP.findByPk(id);

    if (!entrega) {
      return res.status(404).json({ msg: 'Entrega no encontrada' });
    }

    await DetalleEntregaEPP.destroy({ where: { entregaId: id } });
    await FirmaEntregaEPP.destroy({ where: { entregaId: id } });
    await entrega.destroy();

    return res.json({ msg: 'Entrega eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar entrega EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// FIRMA PUBLICA (NO AUTH)
// ========================================

export const obtenerInfoFirmaEpp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;

    const firma = await FirmaEntregaEPP.findOne({ where: { tokenFirma: token } });

    if (!firma) {
      return res.status(404).json({ msg: 'Enlace de firma no válido' });
    }

    if (firma.firmado) {
      return res.status(400).json({ msg: 'Esta firma ya fue registrada', yaFirmado: true });
    }

    const entrega = await EntregaEPP.findByPk(firma.entregaId, {
      include: [
        {
          model: DetalleEntregaEPP,
          as: 'detalles',
          include: [{ model: CatalogoEPP, as: 'epp' }],
        },
        {
          model: FirmaEntregaEPP,
          as: 'firmas',
          attributes: ['id', 'tipo', 'nombreCompleto', 'firmado'],
        },
        { model: User, as: 'creador', attributes: ['Uid', 'name', 'lastName'] },
      ],
    });

    return res.json({
      firma: {
        id: firma.id,
        tipo: firma.tipo,
        nombreCompleto: firma.nombreCompleto,
        email: firma.email,
        firmado: firma.firmado,
      },
      entrega,
    });
  } catch (error) {
    console.error('Error al obtener info de firma EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const firmarEntregaEpp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;
    const { firma: firmaBase64 } = req.body;

    const firma = await FirmaEntregaEPP.findOne({ where: { tokenFirma: token } });

    if (!firma) {
      return res.status(404).json({ msg: 'Enlace de firma no válido' });
    }

    if (firma.firmado) {
      return res.status(400).json({ msg: 'Esta firma ya fue registrada' });
    }

    if (!firmaBase64) {
      return res.status(400).json({ msg: 'La firma es requerida' });
    }

    firma.firma = firmaBase64;
    firma.firmado = true;
    firma.fechaFirma = new Date();
    await firma.save();

    // Verificar si todas las firmas están completadas
    const todasFirmadas = await FirmaEntregaEPP.count({
      where: { entregaId: firma.entregaId, firmado: false },
    }) === 0;

    if (todasFirmadas) {
      await EntregaEPP.update(
        { estado: 'completado' },
        { where: { id: firma.entregaId } },
      );
    }

    return res.json({ msg: 'Firma registrada exitosamente' });
  } catch (error) {
    console.error('Error al firmar entrega EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const reenviarCorreoFirmaEpp = async (req: Request, res: Response): Promise<any> => {
  try {
    const entregaId = parseId(req.params.entregaId);
    const firmaId = parseId(req.params.firmaId);

    const firma = await FirmaEntregaEPP.findOne({
      where: { id: firmaId, entregaId },
    });

    if (!firma) {
      return res.status(404).json({ msg: 'Firma no encontrada' });
    }

    if (firma.firmado) {
      return res.status(400).json({ msg: 'Esta firma ya fue registrada' });
    }

    const entrega = await EntregaEPP.findByPk(entregaId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const enlaceFirma = `${frontendUrl}/firmar-epp/${firma.tokenFirma}`;

    await sendEntregaEppEmail(
      firma.email,
      firma.nombreCompleto,
      {
        fecha: entrega?.fecha || '',
        empresa: entrega?.empresa || '',
        tipoFirma: firma.tipo,
        enlaceFirma,
      }
    );

    return res.json({ msg: 'Correo reenviado exitosamente' });
  } catch (error) {
    console.error('Error al reenviar correo de firma EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// PDF
// ========================================

export const generarPdfEntrega = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);

    const entrega = await EntregaEPP.findByPk(id, {
      include: [
        {
          model: DetalleEntregaEPP,
          as: 'detalles',
          include: [{ model: CatalogoEPP, as: 'epp' }],
        },
        { model: FirmaEntregaEPP, as: 'firmas' },
        { model: User, as: 'creador', attributes: ['Uid', 'name', 'lastName'] },
      ],
    });

    if (!entrega) {
      return res.status(404).json({ msg: 'Entrega no encontrada' });
    }

    const pdfBuffer = await generarEntregaEppPDF(entrega as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="entrega-epp-${id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar PDF de entrega EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ========================================
// ALERTAS
// ========================================

export const obtenerAlertas = async (req: Request, res: Response): Promise<any> => {
  try {
    const { leida } = req.query;

    const where: any = {};
    if (leida !== undefined) {
      where.leida = leida === 'true';
    }

    const alertas = await AlertaEPP.findAll({
      where,
      include: [
        { model: CatalogoEPP, as: 'epp', attributes: ['id', 'nombre', 'categoria'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json(alertas);
  } catch (error) {
    console.error('Error al obtener alertas EPP:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const marcarAlertaLeida = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseId(req.params.id);
    const alerta = await AlertaEPP.findByPk(id);

    if (!alerta) {
      return res.status(404).json({ msg: 'Alerta no encontrada' });
    }

    await alerta.update({ leida: true });

    return res.json({ msg: 'Alerta marcada como leída', alerta });
  } catch (error) {
    console.error('Error al marcar alerta como leída:', error);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};
