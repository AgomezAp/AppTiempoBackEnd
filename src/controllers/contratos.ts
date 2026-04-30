import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Contrato, ContratoModificacion } from '../models/contratos';
import { User } from '../models/user';
import sequelize from '../database/connection';

// ============================================================
// CONTRATOS - Controller
// ============================================================

/**
 * GET /api/contratos/empleado/:uid
 * Retorna todos los contratos de un colaborador con sus modificaciones
 */
export const obtenerContratosEmpleado = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;
        const contratos = await Contrato.findAll({
            where: { Uid: uid },
            include: [{ model: ContratoModificacion, as: 'modificaciones', order: [['created_at', 'DESC']] }],
            order: [['fecha_inicio', 'DESC']]
        });
        res.json(contratos);
    } catch (error) {
        console.error('Error al obtener contratos:', error);
        res.status(500).json({ msg: 'Error al obtener contratos del colaborador' });
    }
};

/**
 * GET /api/contratos/vigentes
 * Retorna todos los contratos activos (Admin)
 */
export const obtenerContratosVigentes = async (req: Request, res: Response) => {
    try {
        const contratos = await Contrato.findAll({
            where: { estado: 'activo' },
            include: [{
                model: User,
                as: 'colaborador',
                attributes: ['Uid', 'name', 'lastName', 'documentoIdentificacion', 'cargo', 'empresa']
            }],
            order: [['fecha_inicio', 'DESC']]
        });
        res.json(contratos);
    } catch (error) {
        console.error('Error al obtener contratos vigentes:', error);
        res.status(500).json({ msg: 'Error al obtener contratos vigentes' });
    }
};

/**
 * GET /api/contratos/:id
 * Retorna un contrato específico con sus modificaciones
 */
export const obtenerContrato = async (req: Request, res: Response) => {
    try {
        const contrato = await Contrato.findByPk(req.params.id as string, {
            include: [
                {
                    model: User,
                    as: 'colaborador',
                    attributes: ['Uid', 'name', 'lastName', 'documentoIdentificacion', 'email', 'cargo']
                },
                { model: ContratoModificacion, as: 'modificaciones', order: [['created_at', 'DESC']] }
            ]
        });
        if (!contrato) return res.status(404).json({ msg: 'Contrato no encontrado' });
        res.json(contrato);
    } catch (error) {
        console.error('Error al obtener contrato:', error);
        res.status(500).json({ msg: 'Error al obtener el contrato' });
    }
};

/**
 * POST /api/contratos
 * Crea un nuevo contrato (solo Admin)
 */
export const crearContrato = async (req: Request, res: Response) => {
    try {
        const {
            Uid, tipo_contrato, numero_contrato, fecha_inicio, fecha_fin,
            salario, cargo, empresa, area, jornada, lugar_trabajo,
            periodo_prueba_dias, observaciones, documento_url
        } = req.body;

        // Verificar que el colaborador existe
        const colaborador = await User.findByPk(Uid);
        if (!colaborador) return res.status(404).json({ msg: 'Colaborador no encontrado' });

        const contrato = await Contrato.create({
            Uid, tipo_contrato, numero_contrato, fecha_inicio, fecha_fin,
            salario, cargo, empresa, area, jornada, lugar_trabajo,
            periodo_prueba_dias: periodo_prueba_dias || 0,
            observaciones, documento_url, estado: 'activo'
        });

        res.status(201).json({ msg: 'Contrato creado exitosamente', contrato });
    } catch (error) {
        console.error('Error al crear contrato:', error);
        res.status(500).json({ msg: 'Error al crear el contrato' });
    }
};

/**
 * PUT /api/contratos/:id
 * Actualiza un contrato existente
 */
export const actualizarContrato = async (req: Request, res: Response) => {
    try {
        const contrato = await Contrato.findByPk(req.params.id as string);
        if (!contrato) return res.status(404).json({ msg: 'Contrato no encontrado' });

        await contrato.update(req.body);
        res.json({ msg: 'Contrato actualizado', contrato });
    } catch (error) {
        console.error('Error al actualizar contrato:', error);
        res.status(500).json({ msg: 'Error al actualizar el contrato' });
    }
};

/**
 * POST /api/contratos/:id/modificaciones
 * Agrega una modificación al contrato (otrosí, suspensión, etc.)
 */
export const agregarModificacion = async (req: Request, res: Response) => {
    try {
        const contrato = await Contrato.findByPk(req.params.id as string);
        if (!contrato) return res.status(404).json({ msg: 'Contrato no encontrado' });

        const {
            tipo_modificacion, fecha_efectiva, descripcion,
            nuevo_salario, nuevo_cargo, nueva_fecha_fin, documento_url
        } = req.body;

        const modificacion = await ContratoModificacion.create({
            contrato_id: contrato.id,
            tipo_modificacion,
            fecha_efectiva,
            descripcion,
            nuevo_salario,
            nuevo_cargo,
            nueva_fecha_fin,
            documento_url
        });

        // Aplicar cambios al contrato si se especificaron
        const cambios: Record<string, unknown> = {};
        if (nuevo_salario) cambios.salario = nuevo_salario;
        if (nuevo_cargo) cambios.cargo = nuevo_cargo;
        if (nueva_fecha_fin) cambios.fecha_fin = nueva_fecha_fin;
        if (tipo_modificacion === 'terminacion') cambios.estado = 'terminado';
        if (tipo_modificacion === 'suspension') cambios.estado = 'suspendido';
        if (tipo_modificacion === 'reactivacion') cambios.estado = 'activo';

        if (Object.keys(cambios).length > 0) {
            await contrato.update(cambios);
        }

        res.status(201).json({ msg: 'Modificación registrada', modificacion });
    } catch (error) {
        console.error('Error al agregar modificación:', error);
        res.status(500).json({ msg: 'Error al registrar la modificación del contrato' });
    }
};

/**
 * GET /api/contratos/:id/pdf
 * Genera un PDF del contrato usando pdfmake
 */
export const generarPdfContrato = async (req: Request, res: Response) => {
    try {
        const contrato = await Contrato.findByPk(req.params.id as string, {
            include: [
                {
                    model: User,
                    as: 'colaborador',
                    attributes: ['Uid', 'name', 'lastName', 'documentoIdentificacion', 'email', 'cargo', 'empresa', 'celular']
                },
                { model: ContratoModificacion, as: 'modificaciones' }
            ]
        });
        if (!contrato) return res.status(404).json({ msg: 'Contrato no encontrado' });

        const pdfmake = await import('pdfmake/build/pdfmake');
        const pdfFonts = await import('pdfmake/build/vfs_fonts');
        (pdfmake as any).vfs = (pdfFonts as any).pdfMake?.vfs;

        const col = (contrato as any).colaborador;
        const fechaInicioStr = contrato.fecha_inicio
            ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'N/A';
        const fechaFinStr = contrato.fecha_fin
            ? new Date(contrato.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'Término Indefinido';

        const docDefinition: any = {
            pageMargins: [60, 80, 60, 60],
            defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
            content: [
                {
                    text: `CONTRATO DE TRABAJO - ${contrato.tipo_contrato.toUpperCase().replace(/-/g, ' ')}`,
                    style: 'titulo',
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                },
                contrato.numero_contrato ? { text: `No. ${contrato.numero_contrato}`, alignment: 'center', margin: [0, 0, 0, 20], color: '#555' } : {},
                { text: 'DATOS DEL EMPLEADOR', style: 'subtitulo', margin: [0, 10, 0, 5] },
                { text: `Empresa: ${contrato.empresa === 'AP' ? 'Andrés Publicidad S.A.S.' : contrato.empresa}`, margin: [0, 0, 0, 3] },

                { text: 'DATOS DEL TRABAJADOR', style: 'subtitulo', margin: [0, 15, 0, 5] },
                col ? { text: `Nombre: ${col.name} ${col.lastName}` } : {},
                col ? { text: `Documento: ${col.documentoIdentificacion}` } : {},
                col ? { text: `Cargo: ${contrato.cargo}` } : {},
                col ? { text: `Área: ${contrato.area || 'N/A'}` } : {},

                { text: 'CONDICIONES DEL CONTRATO', style: 'subtitulo', margin: [0, 15, 0, 5] },
                { text: `Tipo de contrato: ${contrato.tipo_contrato}` },
                { text: `Fecha de inicio: ${fechaInicioStr}` },
                { text: `Fecha de terminación: ${fechaFinStr}` },
                { text: `Salario mensual: $${Number(contrato.salario).toLocaleString('es-CO')}` },
                { text: `Jornada: ${contrato.jornada || 'Tiempo completo'}` },
                { text: `Lugar de trabajo: ${contrato.lugar_trabajo || contrato.empresa}` },

                contrato.observaciones ? { text: `\nObservaciones: ${contrato.observaciones}`, margin: [0, 10, 0, 0] } : {},

                { text: '\n\nFIRMAS', style: 'subtitulo', margin: [0, 30, 0, 20] },
                {
                    columns: [
                        { text: '___________________________\nFirma Empleador', alignment: 'center' },
                        { text: '___________________________\nFirma Trabajador', alignment: 'center' }
                    ]
                }
            ],
            styles: {
                titulo: { fontSize: 14, bold: true },
                subtitulo: { fontSize: 12, bold: true, color: '#1a3c6e' }
            }
        };

        const pdfDoc = (pdfmake as any).createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: Buffer) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=contrato_${contrato.id}.pdf`);
            res.send(buffer);
        });

    } catch (error) {
        console.error('Error al generar PDF de contrato:', error);
        res.status(500).json({ msg: 'Error al generar el PDF del contrato' });
    }
};

// Asociación en runtime (evitar circular imports)
Contrato.belongsTo(User, { foreignKey: 'Uid', as: 'colaborador' });
User.hasMany(Contrato, { foreignKey: 'Uid', as: 'contratos' });
