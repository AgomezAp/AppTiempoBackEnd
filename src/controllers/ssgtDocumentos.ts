import { Request, Response } from 'express';
import { parseId } from '../utils/parseId';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DocumentoFirma, CampoFirmaDocumento } from '../models/ssgt';
import { User } from '../models/user';
import { sendDocumentoFirmaEmail } from '../utils/mailer';
import { PDFDocument } from 'pdf-lib';

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');
const libre = require('libreoffice-convert');
const libreConvertAsync = require('util').promisify(libre.convert);

export const subirDocumento = async (req: Request, res: Response): Promise<any> => {
    try {
        const { titulo, descripcion, empresa } = req.body;
        const userId = (req as any).userId || req.body.userId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No se ha subido ningún archivo' });
        }

        const ext = path.extname(file.originalname).toLowerCase();
        const tipoArchivo = ext === '.pdf' ? 'pdf' : ext.replace('.', '');
        const archivoPdfInicial = ext === '.pdf'
            ? file.originalname
            : path.basename(file.originalname, ext) + '.pdf';

        const documento = await DocumentoFirma.create({
            titulo,
            descripcion,
            empresa,
            creadoPor: userId,
            archivoOriginal: file.originalname,
            archivoPdf: archivoPdfInicial,
            tipoArchivo,
            estado: 'borrador',
            totalPaginas: 0
        });

        const docDir = path.join('uploads', 'documentos', String(documento.id));
        if (!fs.existsSync(docDir)) {
            fs.mkdirSync(docDir, { recursive: true });
        }

        const originalFilePath = path.join(docDir, file.originalname);
        fs.copyFileSync(file.path, originalFilePath);

        let pdfFilePath = originalFilePath;

        if (ext === '.docx' || ext === '.doc') {
            const inputBuffer = fs.readFileSync(originalFilePath);
            const pdfBuffer = await libreConvertAsync(inputBuffer, '.pdf', undefined);
            pdfFilePath = path.join(docDir, archivoPdfInicial);
            fs.writeFileSync(pdfFilePath, pdfBuffer);
            await documento.update({ archivoPdf: path.basename(pdfFilePath) });
        }

        const pdfData = new Uint8Array(fs.readFileSync(pdfFilePath));
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const totalPaginas = pdfDoc.numPages;

        for (let i = 1; i <= totalPaginas; i++) {
            const page = await pdfDoc.getPage(i);
            const scale = 2.0;
            const viewport = page.getViewport({ scale });
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const pngBuffer = canvas.toBuffer('image/png');
            const pngPath = path.join(docDir, `pagina_${i}.png`);
            fs.writeFileSync(pngPath, pngBuffer);
        }

        await documento.update({ totalPaginas });

        return res.status(201).json({ msg: 'Documento subido correctamente', documento });
    } catch (error) {
        console.error('Error al subir documento:', error);
        return res.status(500).json({ msg: 'Error al subir el documento' });
    }
};

export const obtenerDocumentos = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).userId;
        const { estado, empresa } = req.query;
        const where: any = { creadoPor: userId };

        if (estado) where.estado = estado;
        if (empresa) where.empresa = empresa;

        const documentos = await DocumentoFirma.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'creador',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json(documentos);
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        return res.status(500).json({ msg: 'Error al obtener los documentos' });
    }
};

export const obtenerDocumentoPorId = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const userId = (req as any).userId;

        const documento = await DocumentoFirma.findOne({
            where: { id, creadoPor: userId },
            include: [
                {
                    model: CampoFirmaDocumento,
                    as: 'campos'
                },
                {
                    model: User,
                    as: 'creador',
                    attributes: ['Uid', 'name', 'lastName']
                }
            ]
        });

        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        return res.json(documento);
    } catch (error) {
        console.error('Error al obtener documento:', error);
        return res.status(500).json({ msg: 'Error al obtener el documento' });
    }
};

export const eliminarDocumento = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const userId = (req as any).userId;

        const documento = await DocumentoFirma.findOne({ where: { id, creadoPor: userId } });
        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        await CampoFirmaDocumento.destroy({ where: { documentoId: id } });
        await documento.destroy();

        const docDir = path.join('uploads', 'documentos', String(id));
        if (fs.existsSync(docDir)) {
            fs.rmSync(docDir, { recursive: true, force: true });
        }

        return res.json({ msg: 'Documento eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        return res.status(500).json({ msg: 'Error al eliminar el documento' });
    }
};

export const obtenerPaginaImagen = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const num = req.params.num;

        const filePath = path.join('uploads', 'documentos', String(id), `pagina_${num}.png`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ msg: 'Página no encontrada' });
        }

        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error('Error al obtener página:', error);
        return res.status(500).json({ msg: 'Error al obtener la página' });
    }
};

export const guardarCamposFirma = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const { campos } = req.body;

        const documento = await DocumentoFirma.findByPk(id);
        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        await CampoFirmaDocumento.destroy({ where: { documentoId: id } });

        const camposCrear = campos.map((campo: any) => ({
            documentoId: id,
            paginaNumero: campo.paginaNumero,
            posX: campo.posX,
            posY: campo.posY,
            ancho: campo.ancho,
            alto: campo.alto,
            etiqueta: campo.etiqueta,
            nombreFirmante: campo.nombreFirmante,
            emailFirmante: campo.emailFirmante,
            usuarioId: campo.usuarioId || null,
            esExterno: campo.esExterno || false
        }));

        const camposCreados = await CampoFirmaDocumento.bulkCreate(camposCrear);

        return res.json({ msg: 'Campos guardados correctamente', campos: camposCreados });
    } catch (error) {
        console.error('Error al guardar campos de firma:', error);
        return res.status(500).json({ msg: 'Error al guardar los campos de firma' });
    }
};

export const enviarParaFirmar = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const documento = await DocumentoFirma.findByPk(id, {
            include: [{ model: CampoFirmaDocumento, as: 'campos' }]
        });

        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        const campos = (documento as any).campos;
        if (!campos || campos.length === 0) {
            return res.status(400).json({ msg: 'El documento no tiene campos de firma configurados' });
        }

        for (const campo of campos) {
            const token = crypto.randomBytes(32).toString('hex');
            await campo.update({ tokenFirma: token });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const firmaUrl = `${frontendUrl}/firmar-documento/${token}`;

            await sendDocumentoFirmaEmail(
                campo.emailFirmante,
                campo.nombreFirmante,
                {
                    titulo: (documento as any).titulo,
                    empresa: (documento as any).empresa || '',
                    etiqueta: campo.etiqueta,
                    enlaceFirma: firmaUrl,
                }
            );
        }

        await documento.update({ estado: 'pendiente' });

        return res.json({ msg: 'Documento enviado para firmar correctamente' });
    } catch (error) {
        console.error('Error al enviar documento para firmar:', error);
        return res.status(500).json({ msg: 'Error al enviar el documento para firmar' });
    }
};

export const reenviarCorreoCampo = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);
        const campoId = parseId(req.params.campoId);

        const campo = await CampoFirmaDocumento.findOne({
            where: { id: campoId, documentoId: id }
        });

        if (!campo) {
            return res.status(404).json({ msg: 'Campo de firma no encontrado' });
        }

        if ((campo as any).firmado) {
            return res.status(400).json({ msg: 'Este campo ya ha sido firmado' });
        }

        const documento = await DocumentoFirma.findByPk(id);
        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const firmaUrl = `${frontendUrl}/firmar-documento/${(campo as any).tokenFirma}`;

        await sendDocumentoFirmaEmail(
            (campo as any).emailFirmante,
            (campo as any).nombreFirmante,
            {
                titulo: (documento as any).titulo,
                empresa: (documento as any).empresa || '',
                etiqueta: (campo as any).etiqueta,
                enlaceFirma: firmaUrl,
            }
        );

        return res.json({ msg: 'Correo reenviado correctamente' });
    } catch (error) {
        console.error('Error al reenviar correo:', error);
        return res.status(500).json({ msg: 'Error al reenviar el correo' });
    }
};

export const obtenerInfoFirmaDoc = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.params;

        const campo = await CampoFirmaDocumento.findOne({
            where: { tokenFirma: token },
            include: [
                {
                    model: DocumentoFirma,
                    as: 'documento'
                }
            ]
        });

        if (!campo) {
            return res.status(404).json({ msg: 'Token de firma no válido' });
        }

        return res.json(campo);
    } catch (error) {
        console.error('Error al obtener info de firma:', error);
        return res.status(500).json({ msg: 'Error al obtener la información de firma' });
    }
};

export const firmarDocumento = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.params;
        const { firma } = req.body;

        const campo = await CampoFirmaDocumento.findOne({
            where: { tokenFirma: token }
        });

        if (!campo) {
            return res.status(404).json({ msg: 'Token de firma no válido' });
        }

        if ((campo as any).firmado) {
            return res.status(400).json({ msg: 'Este campo ya ha sido firmado' });
        }

        await campo.update({
            firma,
            firmado: true,
            fechaFirma: new Date()
        });

        const documentoId = (campo as any).documentoId;
        const totalCampos = await CampoFirmaDocumento.count({ where: { documentoId } });
        const camposFirmados = await CampoFirmaDocumento.count({ where: { documentoId, firmado: true } });

        if (camposFirmados === totalCampos) {
            await DocumentoFirma.update(
                { estado: 'completado' },
                { where: { id: documentoId } }
            );
        }

        return res.json({ msg: 'Documento firmado correctamente' });
    } catch (error) {
        console.error('Error al firmar documento:', error);
        return res.status(500).json({ msg: 'Error al firmar el documento' });
    }
};

export const generarPdfFirmado = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = parseId(req.params.id);

        const documento = await DocumentoFirma.findByPk(id, {
            include: [{ model: CampoFirmaDocumento, as: 'campos' }]
        });

        if (!documento) {
            return res.status(404).json({ msg: 'Documento no encontrado' });
        }

        const docDir = path.join('uploads', 'documentos', String(id));
        const pdfFileName = (documento as any).archivoPdf;
        const pdfFilePath = path.join(docDir, pdfFileName);

        if (!fs.existsSync(pdfFilePath)) {
            return res.status(404).json({ msg: 'Archivo PDF no encontrado' });
        }

        const pdfBytes = fs.readFileSync(pdfFilePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const campos = (documento as any).campos;

        for (const campo of campos) {
            if (!campo.firmado || !campo.firma) continue;

            const pageIndex = campo.paginaNumero - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { width, height } = page.getSize();

            const mimeMatch = campo.firma.match(/^data:image\/(\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'png';
            const base64Data = campo.firma.replace(/^data:image\/\w+;base64,/, '');
            const firmaBuffer = Buffer.from(base64Data, 'base64');

            let firmaImage;
            try {
                firmaImage = (mimeType === 'jpeg' || mimeType === 'jpg')
                    ? await pdfDoc.embedJpg(firmaBuffer)
                    : await pdfDoc.embedPng(firmaBuffer);
            } catch (embedErr: any) {
                // Fallback: convertir a PNG via canvas para formatos no soportados (webp, gif, etc.)
                try {
                    const { loadImage: loadImg, createCanvas: makeCanvas } = require('canvas');
                    const img = await loadImg(campo.firma);
                    const cvs = makeCanvas(img.width, img.height);
                    cvs.getContext('2d').drawImage(img, 0, 0);
                    firmaImage = await pdfDoc.embedPng(cvs.toBuffer('image/png'));
                } catch {
                    const firmante = campo.nombreFirmante || campo.emailFirmante || 'firmante desconocido';
                    return res.status(422).json({
                        msg: `La firma de "${firmante}" tiene un formato de imagen no soportado (${mimeType || 'desconocido'}). Solo se permiten PNG y JPEG. Solicite al firmante que vuelva a firmar usando una imagen PNG o JPG.`
                    });
                }
            }

            const x = (campo.posX / 100) * width;
            const y = height - ((campo.posY / 100) * height) - ((campo.alto / 100) * height);
            const w = (campo.ancho / 100) * width;
            const h = (campo.alto / 100) * height;

            page.drawImage(firmaImage, {
                x,
                y,
                width: w,
                height: h
            });
        }

        const pdfFirmadoBytes = await pdfDoc.save();
        const buffer = Buffer.from(pdfFirmadoBytes);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${(documento as any).titulo}_firmado.pdf"`);
        return res.send(buffer);
    } catch (error: any) {
        console.error('Error al generar PDF firmado:', error);
        const mensaje = error?.message || '';
        if (mensaje.includes('PNG') || mensaje.includes('JPEG') || mensaje.includes('Unknown image') || mensaje.includes('image format')) {
            return res.status(422).json({ msg: 'Una de las firmas contiene un formato de imagen no soportado. Solo se permiten PNG y JPEG.' });
        }
        if (mensaje.includes('not found') || mensaje.includes('ENOENT')) {
            return res.status(404).json({ msg: 'El archivo PDF original no fue encontrado en el servidor.' });
        }
        return res.status(500).json({ msg: 'Error al generar el PDF firmado. Intente de nuevo o contacte al administrador.' });
    }
};
