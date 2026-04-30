import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import { User } from '../models/user';
import { ExperienciaLaboral, FormacionAcademica, Habilidad, Referencia, GrupoFamiliar, DocumentoExpediente, NotaExpediente } from '../models/hojaVida';
import { Permiso } from '../models/permisos';
import { Novedad } from '../models/time';
import { ActaEntrega, DetalleActa, Dispositivo } from '../models/inventario/dispositivo';
import { ActaConsumible, ActaMobiliario, TipoInventario, DetalleActaConsumible } from '../models/inventario/consumibles';

// ============================================================
// HOJA DE VIDA - Controller
// ============================================================

/**
 * GET /api/hoja-vida/:uid
 * Retorna la hoja de vida completa del colaborador:
 * datos personales + experiencia + formación + habilidades + referencias + grupo familiar
 */
export const obtenerHojaVidaCompleta = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;

        // Obtener datos del colaborador (incluyendo nuevos campos de hoja de vida)
        const colaborador = await User.findByPk(uid as string, {
            attributes: { exclude: ['password'] }
        });
        if (!colaborador) return res.status(404).json({ msg: 'Colaborador no encontrado' });

        // Obtener todos los componentes de la hoja de vida en paralelo
        const [experiencias, formaciones, habilidades, referencias, grupoFamiliar] = await Promise.all([
            ExperienciaLaboral.findAll({ where: { Uid: uid }, order: [['fecha_inicio', 'DESC']] }),
            FormacionAcademica.findAll({ where: { Uid: uid }, order: [['fecha_fin', 'DESC']] }),
            Habilidad.findAll({ where: { Uid: uid }, order: [['tipo', 'ASC'], ['habilidad', 'ASC']] }),
            Referencia.findAll({ where: { Uid: uid }, order: [['tipo', 'ASC']] }),
            GrupoFamiliar.findAll({ where: { Uid: uid }, order: [['parentesco', 'ASC']] })
        ]);

        res.json({
            colaborador,
            experiencias,
            formaciones,
            habilidades,
            referencias,
            grupoFamiliar
        });
    } catch (error) {
        console.error('Error al obtener hoja de vida:', error);
        res.status(500).json({ msg: 'Error al obtener la hoja de vida' });
    }
};

/**
 * GET /api/hoja-vida/:uid/pdf
 * Genera PDF de la hoja de vida usando pdfmake
 */
export const generarPdfHojaVida = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;

        const colaborador = await User.findByPk(uid as string, { attributes: { exclude: ['password'] } });
        if (!colaborador) return res.status(404).json({ msg: 'Colaborador no encontrado' });

        const [experiencias, formaciones, habilidades, referencias, grupoFamiliar] = await Promise.all([
            ExperienciaLaboral.findAll({ where: { Uid: uid }, order: [['fecha_inicio', 'DESC']] }),
            FormacionAcademica.findAll({ where: { Uid: uid }, order: [['fecha_fin', 'DESC']] }),
            Habilidad.findAll({ where: { Uid: uid }, order: [['tipo', 'ASC']] }),
            Referencia.findAll({ where: { Uid: uid }, order: [['tipo', 'ASC']] }),
            GrupoFamiliar.findAll({ where: { Uid: uid } })
        ]);

        const pdfmake = await import('pdfmake/build/pdfmake');
        const pdfFonts = await import('pdfmake/build/vfs_fonts');
        (pdfmake as any).vfs = (pdfFonts as any).pdfMake?.vfs;

        const col = colaborador.toJSON() as any;

        // ---- Construcción del documento PDF ----
        const seccion = (titulo: string) => ({
            text: titulo,
            style: 'seccion',
            margin: [0, 15, 0, 5]
        });

        const linea = (etiqueta: string, valor?: string | null) =>
            valor ? { text: [{ text: `${etiqueta}: `, bold: true }, valor], margin: [0, 1, 0, 1] } : null;

        const contenido: any[] = [
            // Encabezado
            { text: `${col.name} ${col.lastName}`, style: 'nombre' },
            { text: col.cargo || '', alignment: 'center', color: '#555', margin: [0, 0, 0, 5] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1a3c6e' }] },

            // Datos personales
            seccion('DATOS PERSONALES'),
            {
                columns: [
                    [
                        linea('Documento', col.documentoIdentificacion),
                        linea('Tipo Documento', col.tipo_documento),
                        linea('Fecha Nacimiento', col.fecha_nacimiento ? new Date(col.fecha_nacimiento).toLocaleDateString('es-CO') : null),
                        linea('Lugar Nacimiento', col.lugar_nacimiento),
                        linea('Género', col.genero),
                        linea('Estado Civil', col.estado_civil),
                        linea('RH', col.rh)
                    ],
                    [
                        linea('Correo', col.email),
                        linea('Celular', col.celular),
                        linea('Teléfono', col.telefono_fijo),
                        linea('Dirección', col.direccion),
                        linea('Ciudad', col.ciudad),
                        linea('Barrio', col.barrio)
                    ]
                ]
            },

            // Contacto de emergencia
            col.contacto_emergencia_nombre ? seccion('CONTACTO DE EMERGENCIA') : null,
            linea('Nombre', col.contacto_emergencia_nombre),
            linea('Teléfono', col.contacto_emergencia_telefono),
            linea('Parentesco', col.contacto_emergencia_parentesco),

            // Seguridad social
            seccion('SEGURIDAD SOCIAL'),
            {
                columns: [
                    [linea('EPS', col.eps), linea('ARL', col.arl)],
                    [linea('Pensión', col.fondoPension), linea('Cesantías', col.fondoCesantias)],
                    [linea('Caja Compensación', col.caja_compensacion)]
                ]
            },

            // Tallas
            (col.talla_camisa || col.talla_pantalon || col.talla_zapatos) ? seccion('TALLAS Y DOTACIÓN') : null,
            {
                columns: [
                    linea('Camisa', col.talla_camisa),
                    linea('Pantalón', col.talla_pantalon),
                    linea('Zapatos', col.talla_zapatos)
                ].filter(Boolean)
            },

            // Datos bancarios
            (col.banco || col.numero_cuenta_bancaria) ? seccion('DATOS BANCARIOS') : null,
            linea('Banco', col.banco),
            linea('Tipo Cuenta', col.tipo_cuenta_bancaria),
            linea('Número Cuenta', col.numero_cuenta_bancaria),
        ].filter(Boolean);

        // Experiencia laboral
        if (experiencias.length > 0) {
            contenido.push(seccion('EXPERIENCIA LABORAL'));
            for (const exp of experiencias as any[]) {
                const inicio = exp.fecha_inicio ? new Date(exp.fecha_inicio).toLocaleDateString('es-CO') : '';
                const fin = exp.fecha_fin ? new Date(exp.fecha_fin).toLocaleDateString('es-CO') : (exp.activo ? 'Actualidad' : '');
                contenido.push({
                    margin: [0, 5, 0, 5],
                    stack: [
                        { text: `${exp.cargo} - ${exp.empresa}`, bold: true },
                        { text: `${inicio} - ${fin}`, color: '#555', fontSize: 10 },
                        exp.descripcion ? { text: exp.descripcion, margin: [0, 2, 0, 0] } : null,
                        exp.jefe_inmediato ? { text: `Jefe inmediato: ${exp.jefe_inmediato}`, fontSize: 10, color: '#777' } : null
                    ].filter(Boolean)
                });
            }
        }

        // Formación académica
        if (formaciones.length > 0) {
            contenido.push(seccion('FORMACIÓN ACADÉMICA'));
            for (const form of formaciones as any[]) {
                const fin = form.fecha_fin ? new Date(form.fecha_fin).toLocaleDateString('es-CO') : (form.graduado ? '' : 'En curso');
                contenido.push({
                    margin: [0, 4, 0, 4],
                    stack: [
                        { text: `${form.titulo || form.nivel} - ${form.institucion}`, bold: true },
                        { text: `${fin ? `Graduado: ${fin}` : 'En curso'} | ${form.graduado ? 'Graduado' : 'En proceso'}`, fontSize: 10, color: '#555' }
                    ]
                });
            }
        }

        // Habilidades
        if (habilidades.length > 0) {
            contenido.push(seccion('HABILIDADES'));
            const agrupadas: Record<string, any[]> = {};
            for (const hab of habilidades as any[]) {
                const tipo = hab.tipo || 'General';
                if (!agrupadas[tipo]) agrupadas[tipo] = [];
                agrupadas[tipo].push(`${hab.habilidad}${hab.nivel ? ` (${hab.nivel})` : ''}`);
            }
            for (const [tipo, items] of Object.entries(agrupadas)) {
                contenido.push({ text: [`${tipo}: `, { text: items.join(' | '), bold: false }], bold: true, margin: [0, 2, 0, 2] });
            }
        }

        // Grupos familiar
        if (grupoFamiliar.length > 0) {
            contenido.push(seccion('GRUPO FAMILIAR'));
            contenido.push({
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Nombre', bold: true }, { text: 'Parentesco', bold: true },
                            { text: 'F. Nacimiento', bold: true }, { text: 'Dependiente', bold: true }
                        ],
                        ...(grupoFamiliar as any[]).map(gf => [
                            gf.nombre,
                            gf.parentesco,
                            gf.fecha_nacimiento ? new Date(gf.fecha_nacimiento).toLocaleDateString('es-CO') : '',
                            gf.dependiente ? 'Sí' : 'No'
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            });
        }

        // Referencias
        if (referencias.length > 0) {
            contenido.push(seccion('REFERENCIAS'));
            for (const ref of referencias as any[]) {
                contenido.push({
                    text: `${ref.nombre} | ${ref.cargo || ''} | ${ref.empresa || ''} | Tel: ${ref.telefono} | (${ref.tipo})`,
                    margin: [0, 2, 0, 2]
                });
            }
        }

        const docDefinition: any = {
            pageMargins: [50, 60, 50, 60],
            defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.35 },
            content: contenido,
            styles: {
                nombre: { fontSize: 18, bold: true, alignment: 'center', color: '#1a3c6e', margin: [0, 0, 0, 4] },
                seccion: { fontSize: 12, bold: true, color: '#1a3c6e', decoration: 'underline' }
            }
        };

        const pdfDoc = (pdfmake as any).createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: Buffer) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=hoja_vida_${uid}.pdf`);
            res.send(buffer);
        });

    } catch (error) {
        console.error('Error al generar PDF de hoja de vida:', error);
        res.status(500).json({ msg: 'Error al generar el PDF de la hoja de vida' });
    }
};

// ============================================================
// CRUD POR SECCIÓN
// ============================================================

// --- EXPERIENCIA LABORAL ---
export const agregarExperiencia = async (req: Request, res: Response) => {
    try {
        const experiencia = await ExperienciaLaboral.create({ ...req.body, Uid: req.params.uid });
        res.status(201).json({ msg: 'Experiencia registrada', experiencia });
    } catch (error) { res.status(500).json({ msg: 'Error al registrar la experiencia laboral' }); }
};

export const editarExperiencia = async (req: Request, res: Response) => {
    try {
        const item = await ExperienciaLaboral.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.update(req.body);
        res.json({ msg: 'Experiencia actualizada', item });
    } catch (error) { res.status(500).json({ msg: 'Error al actualizar la experiencia' }); }
};

export const eliminarExperiencia = async (req: Request, res: Response) => {
    try {
        const item = await ExperienciaLaboral.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.destroy();
        res.json({ msg: 'Experiencia eliminada' });
    } catch (error) { res.status(500).json({ msg: 'Error al eliminar la experiencia' }); }
};

// --- FORMACIÓN ACADÉMICA ---
export const agregarFormacion = async (req: Request, res: Response) => {
    try {
        const form = await FormacionAcademica.create({ ...req.body, Uid: req.params.uid });
        res.status(201).json({ msg: 'Formación registrada', formacion: form });
    } catch (error) { res.status(500).json({ msg: 'Error al registrar la formación' }); }
};

export const editarFormacion = async (req: Request, res: Response) => {
    try {
        const item = await FormacionAcademica.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.update(req.body);
        res.json({ msg: 'Formación actualizada', item });
    } catch (error) { res.status(500).json({ msg: 'Error al actualizar la formación' }); }
};

export const eliminarFormacion = async (req: Request, res: Response) => {
    try {
        const item = await FormacionAcademica.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.destroy();
        res.json({ msg: 'Formación eliminada' });
    } catch (error) { res.status(500).json({ msg: 'Error al eliminar la formación' }); }
};

// --- HABILIDADES ---
export const agregarHabilidad = async (req: Request, res: Response) => {
    try {
        const hab = await Habilidad.create({ ...req.body, Uid: req.params.uid });
        res.status(201).json({ msg: 'Habilidad registrada', habilidad: hab });
    } catch (error) { res.status(500).json({ msg: 'Error al registrar la habilidad' }); }
};

export const eliminarHabilidad = async (req: Request, res: Response) => {
    try {
        const item = await Habilidad.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.destroy();
        res.json({ msg: 'Habilidad eliminada' });
    } catch (error) { res.status(500).json({ msg: 'Error al eliminar la habilidad' }); }
};

// --- REFERENCIAS ---
export const agregarReferencia = async (req: Request, res: Response) => {
    try {
        const ref = await Referencia.create({ ...req.body, Uid: req.params.uid });
        res.status(201).json({ msg: 'Referencia registrada', referencia: ref });
    } catch (error) { res.status(500).json({ msg: 'Error al registrar la referencia' }); }
};

export const eliminarReferencia = async (req: Request, res: Response) => {
    try {
        const item = await Referencia.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.destroy();
        res.json({ msg: 'Referencia eliminada' });
    } catch (error) { res.status(500).json({ msg: 'Error al eliminar la referencia' }); }
};

// --- GRUPO FAMILIAR ---
export const agregarFamiliar = async (req: Request, res: Response) => {
    try {
        const familiar = await GrupoFamiliar.create({ ...req.body, Uid: req.params.uid });
        res.status(201).json({ msg: 'Familiar registrado', familiar });
    } catch (error) { res.status(500).json({ msg: 'Error al registrar el familiar' }); }
};

export const editarFamiliar = async (req: Request, res: Response) => {
    try {
        const item = await GrupoFamiliar.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.update(req.body);
        res.json({ msg: 'Familiar actualizado', item });
    } catch (error) { res.status(500).json({ msg: 'Error al actualizar el familiar' }); }
};

export const eliminarFamiliar = async (req: Request, res: Response) => {
    try {
        const item = await GrupoFamiliar.findByPk(req.params.id as string);
        if (!item) return res.status(404).json({ msg: 'Registro no encontrado' });
        await item.destroy();
        res.json({ msg: 'Familiar eliminado' });
    } catch (error) { res.status(500).json({ msg: 'Error al eliminar el familiar' }); }
};

// ============================================================
// EXPEDIENTE: TRAZABILIDAD EMPRESA
// ============================================================

// --- Permisos y Ausencias ---
export const obtenerPermisosExpediente = async (req: Request, res: Response) => {
    try {
        const permisos = await Permiso.findAll({
            where: { Uid: req.params.uid },
            order: [['fecha', 'DESC']]
        });
        res.json(permisos);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener permisos del colaborador' });
    }
};

// --- Novedades ---
export const obtenerNovedadesExpediente = async (req: Request, res: Response) => {
    try {
        const novedades = await Novedad.findAll({
            where: { Nid: req.params.uid },
            order: [['Fecha', 'DESC']]
        });
        res.json(novedades);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener novedades del colaborador' });
    }
};

// --- Actas de Inventario (dispositivos + consumibles + mobiliario) ---
export const obtenerActasInventarioExpediente = async (req: Request, res: Response) => {
    try {
        const colaborador = await User.findByPk(req.params.uid as string, {
            attributes: ['documentoIdentificacion', 'name', 'lastName']
        });
        if (!colaborador) return res.status(404).json({ msg: 'Colaborador no encontrado' });

        const col = colaborador.toJSON() as any;
        const cedula = col.documentoIdentificacion;
        const nombre = `${col.name} ${col.lastName}`.toLowerCase();

        // Filtro: por cédula exacta o por nombre aproximado como fallback
        const where: any = cedula
            ? { cedulaReceptor: cedula }
            : { nombreReceptor: { [Op.iLike]: `%${nombre}%` } };

        const [actasDispositivos, actasConsumibles, actasMobiliario] = await Promise.all([
            ActaEntrega.findAll({
                where,
                include: [{ model: DetalleActa, as: 'detalles', include: [{ model: Dispositivo, as: 'dispositivo', attributes: ['nombre', 'categoria', 'marca', 'modelo', 'serial'] }] }],
                order: [['fechaEntrega', 'DESC']]
            }),
            ActaConsumible.findAll({
                where,
                include: [{ model: TipoInventario, as: 'tipoInventario', attributes: ['nombre', 'codigo'] }],
                order: [['fechaEntrega', 'DESC']]
            }),
            ActaMobiliario.findAll({
                where,
                order: [['createdAt', 'DESC']]
            })
        ]);

        res.json({
            dispositivos: actasDispositivos,
            consumibles: actasConsumibles,
            mobiliario: actasMobiliario
        });
    } catch (error) {
        console.error('Error al obtener actas de inventario:', error);
        res.status(500).json({ msg: 'Error al obtener actas de inventario del colaborador' });
    }
};

// ============================================================
// DOCUMENTOS EXPEDIENTE
// ============================================================

export const listarDocumentosExpediente = async (req: Request, res: Response) => {
    try {
        const docs = await DocumentoExpediente.findAll({
            where: { Uid: req.params.uid },
            order: [['created_at', 'DESC']]
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener documentos del expediente' });
    }
};

export const subirDocumentoExpediente = async (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ msg: 'No se recibió ningún archivo' });

        const tokenPayload = (req as any).user;
        const adminNombre = tokenPayload ? `${tokenPayload.name || ''} ${tokenPayload.lastName || ''}`.trim() : 'Admin';

        const doc = await DocumentoExpediente.create({
            Uid: parseInt(req.params.uid as string),
            nombre: req.body.nombre || file.originalname,
            descripcion: req.body.descripcion || '',
            ruta: file.path.replace(/\\/g, '/'),
            tipo_archivo: file.mimetype,
            admin_nombre: adminNombre
        });

        res.status(201).json({ msg: 'Documento subido correctamente', documento: doc });
    } catch (error) {
        res.status(500).json({ msg: 'Error al subir el documento' });
    }
};

export const eliminarDocumentoExpediente = async (req: Request, res: Response) => {
    try {
        const doc = await DocumentoExpediente.findByPk(req.params.docId as string);
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado' });

        // Eliminar archivo físico
        const ruta = (doc as any).ruta;
        if (ruta && fs.existsSync(ruta)) fs.unlinkSync(ruta);

        await doc.destroy();
        res.json({ msg: 'Documento eliminado' });
    } catch (error) {
        res.status(500).json({ msg: 'Error al eliminar el documento' });
    }
};

export const descargarDocumentoExpediente = async (req: Request, res: Response) => {
    try {
        const doc = await DocumentoExpediente.findByPk(req.params.docId as string);
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado' });

        const ruta = (doc as any).ruta;
        if (!ruta || !fs.existsSync(ruta)) return res.status(404).json({ msg: 'Archivo no encontrado en el servidor' });

        res.download(ruta, (doc as any).nombre);
    } catch (error) {
        res.status(500).json({ msg: 'Error al descargar el documento' });
    }
};

// ============================================================
// NOTAS EXPEDIENTE
// ============================================================

export const listarNotasExpediente = async (req: Request, res: Response) => {
    try {
        const notas = await NotaExpediente.findAll({
            where: { Uid: req.params.uid },
            order: [['created_at', 'DESC']]
        });
        res.json(notas);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener notas del expediente' });
    }
};

export const agregarNotaExpediente = async (req: Request, res: Response) => {
    try {
        const { nota } = req.body;
        if (!nota?.trim()) return res.status(400).json({ msg: 'La nota no puede estar vacía' });

        const tokenPayload = (req as any).user;
        const adminNombre = tokenPayload ? `${tokenPayload.name || ''} ${tokenPayload.lastName || ''}`.trim() : 'Admin';

        const nuevaNota = await NotaExpediente.create({
            Uid: parseInt(req.params.uid as string),
            nota: nota.trim(),
            admin_nombre: adminNombre
        });

        res.status(201).json({ msg: 'Nota agregada', nota: nuevaNota });
    } catch (error) {
        res.status(500).json({ msg: 'Error al agregar la nota' });
    }
};

export const eliminarNotaExpediente = async (req: Request, res: Response) => {
    try {
        const notaItem = await NotaExpediente.findByPk(req.params.notaId as string);
        if (!notaItem) return res.status(404).json({ msg: 'Nota no encontrada' });
        await notaItem.destroy();
        res.json({ msg: 'Nota eliminada' });
    } catch (error) {
        res.status(500).json({ msg: 'Error al eliminar la nota' });
    }
};
