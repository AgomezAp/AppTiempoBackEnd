import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { PlantillaCertificado } from '../models/plantillaCertificado';
import { User } from '../models/user';
import { Area } from '../models/area';
import {
  getEmpresaConfig,
  drawLetterhead,
  drawFooterBar,
  wrapTextJustified,
  sendMultipleCanvasAsPdf,
  drawImageTransparent,
} from './certificado';

// ---- CRUD ----

export const getPlantillasAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const plantillas = await PlantillaCertificado.findAll({ order: [['orden', 'ASC'], ['nombre', 'ASC']] });
    res.json(plantillas);
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al obtener plantillas', error: error.message });
  }
};

export const getPlantillasActivas = async (req: Request, res: Response): Promise<any> => {
  try {
    const plantillas = await PlantillaCertificado.findAll({ where: { activo: true }, order: [['orden', 'ASC']] });
    res.json(plantillas);
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al obtener plantillas', error: error.message });
  }
};

export const createPlantilla = async (req: Request, res: Response): Promise<any> => {
  try {
    const { codigo, nombre, titulo, descripcion, cuerpo, variables_disponibles, orden } = req.body;
    if (!codigo || !nombre || !titulo || !cuerpo) {
      return res.status(400).json({ msg: 'codigo, nombre, titulo y cuerpo son obligatorios' });
    }
    const existe = await PlantillaCertificado.findOne({ where: { codigo } });
    if (existe) return res.status(400).json({ msg: 'Ya existe una plantilla con ese código' });
    const plantilla = await PlantillaCertificado.create({
      codigo, nombre, titulo, descripcion, cuerpo,
      variables_disponibles: variables_disponibles || [],
      orden: orden ?? 99,
    });
    res.status(201).json(plantilla);
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al crear plantilla', error: error.message });
  }
};

export const updatePlantilla = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const plantilla = await PlantillaCertificado.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    const { codigo, nombre, titulo, descripcion, cuerpo, variables_disponibles, orden } = req.body;
    if (codigo && codigo !== plantilla.codigo) {
      const existe = await PlantillaCertificado.findOne({ where: { codigo } });
      if (existe) return res.status(400).json({ msg: 'Ya existe una plantilla con ese código' });
    }
    await plantilla.update({ codigo, nombre, titulo, descripcion, cuerpo, variables_disponibles, orden });
    res.json(plantilla);
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al actualizar plantilla', error: error.message });
  }
};

export const togglePlantilla = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const plantilla = await PlantillaCertificado.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    plantilla.activo = !plantilla.activo;
    await plantilla.save();
    res.json(plantilla);
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al cambiar estado', error: error.message });
  }
};

export const deletePlantilla = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const plantilla = await PlantillaCertificado.findByPk(id);
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla no encontrada' });
    await plantilla.destroy();
    res.json({ msg: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ msg: 'Error al eliminar plantilla', error: error.message });
  }
};

// ---- Utilidades de texto ----

const formatCurrencyLocal = (amount: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const numberToWordsLocal = (num: number): string => {
  const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  if (num === 0) return 'cero';
  if (num === 100) return 'cien';
  let words = '';
  if (num >= 1000000) { const m = Math.floor(num / 1000000); words += m === 1 ? 'un millón ' : `${numberToWordsLocal(m)} millones `; num %= 1000000; }
  if (num >= 1000) { const t = Math.floor(num / 1000); words += t === 1 ? 'mil ' : `${numberToWordsLocal(t)} mil `; num %= 1000; }
  if (num >= 100) { words += hundreds[Math.floor(num / 100)] + ' '; num %= 100; }
  if (num >= 20) { words += tens[Math.floor(num / 10)]; if (num % 10 > 0) words += ' y ' + units[num % 10]; words += ' '; }
  else if (num >= 10) { words += teens[num - 10] + ' '; }
  else if (num > 0) { words += units[num] + ' '; }
  return words.trim();
};

const formatDateSpanishLocal = (date: Date): string => {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const day = date.getDate();
  return `${day} ${day === 1 ? 'día' : 'días'} del mes de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const formatDateSimpleLocal = (date: Date): string => {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

// Sustituye {{variable}} y también { {variable}} con posibles espacios
const substituirVariables = (texto: string, vars: Record<string, string>): string => {
  let resultado = texto;
  for (const [key, val] of Object.entries(vars)) {
    resultado = resultado.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), val || '');
  }
  return resultado;
};

// ---- Generación de canvas con el mismo estilo que los demás certificados ----

const generarCanvasDesdeTemplate = async (
  plantilla: PlantillaCertificado,
  usuario: any,
  empresaData: any,
  empresaCode: string,
  variables: Record<string, string>,
  conFirma: boolean
): Promise<any> => {
  const width = 2480;
  const height = 3508;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Membrete (fondo, barra lateral, watermark, logo) — idéntico al resto
  const logoBottomY = await drawLetterhead(ctx, width, height, empresaData, empresaCode);

  // Título del certificado — igual que generarCertificadoImagen
  const tituloFinal = substituirVariables(plantilla.titulo, variables);
  ctx.font = "bold 95px 'Helvetica'";
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  const tituloY = logoBottomY + 120;
  ctx.fillText(tituloFinal, width / 2, tituloY);

  // Nombre + NIT de la empresa debajo del título
  ctx.font = "bold 56px 'Helvetica'";
  ctx.fillText(empresaData.nombre || '', width / 2, tituloY + 200);
  if (empresaData.nit) {
    ctx.font = "bold 46px 'Helvetica'";
    ctx.fillText(empresaData.nit, width / 2, tituloY + 270);
  }

  // Contenido (cuerpo del certificado)
  const marginLeft = 300;
  const marginRight = 300;
  const contentWidth = width - marginLeft - marginRight;
  let yPos = tituloY + 450;

  ctx.textAlign = 'left';
  ctx.font = "42px 'Helvetica'";
  ctx.fillStyle = '#000000';

  // Dividir cuerpo en párrafos y renderizar cada uno
  const cuerpoFinal = substituirVariables(plantilla.cuerpo, variables);
  const parrafos = cuerpoFinal.split('\n');

  for (const parrafo of parrafos) {
    const linea = parrafo.trim();
    if (!linea) {
      yPos += 50; // línea vacía → separación entre párrafos
      continue;
    }
    yPos = wrapTextJustified(ctx, linea, marginLeft, yPos, contentWidth, 72) + 30;
  }

  // Firma — igual que en otros certificados
  const firmaY = height - 500;

  if (conFirma) {
    // Firma del gerente (izquierda)
    const firmaGerenteX = width * 0.25;
    const firmaFileName = empresaCode === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, '../../public', firmaFileName);
    if (fs.existsSync(firmaPath)) {
      const firmaWidth = 350;
      const firmaImg = await loadImage(firmaPath);
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaGerenteX - firmaWidth / 2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaGerenteX - 320, firmaY);
    ctx.lineTo(firmaGerenteX + 320, firmaY);
    ctx.stroke();

    ctx.font = "bold 40px 'Helvetica'";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(empresaData.gerente || '', firmaGerenteX, firmaY + 55);
    ctx.font = "36px 'Helvetica'";
    ctx.fillText(`Cédula: ${empresaData.cedulaGerente || ''}`, firmaGerenteX, firmaY + 100);
    ctx.fillText(empresaData.cargo_gerente || 'Representante Legal', firmaGerenteX, firmaY + 145);
    ctx.fillText(empresaData.nombre || '', firmaGerenteX, firmaY + 190);
  } else {
    // Solo firma centrada (versión digital)
    const firmaX = width / 2;
    const firmaFileName = empresaCode === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, '../../public', firmaFileName);
    if (fs.existsSync(firmaPath)) {
      const firmaWidth = 350;
      const firmaImg = await loadImage(firmaPath);
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaX - firmaWidth / 2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaX - 300, firmaY);
    ctx.lineTo(firmaX + 300, firmaY);
    ctx.stroke();

    ctx.font = "bold 40px 'Helvetica'";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(empresaData.gerente || '', firmaX, firmaY + 55);
    ctx.font = "36px 'Helvetica'";
    ctx.fillText(`Cédula: ${empresaData.cedulaGerente || ''}`, firmaX, firmaY + 100);
    ctx.fillText(empresaData.cargo_gerente || 'Representante Legal', firmaX, firmaY + 145);
    ctx.fillText(empresaData.nombre || '', firmaX, firmaY + 190);
  }

  // Barra de pie de página — idéntica al resto
  await drawFooterBar(ctx, width, height, empresaData, empresaCode);

  return canvas;
};

// ---- Endpoint de generación de PDF ----

export const generarPdfDesdeTemplate = async (req: Request, res: Response): Promise<any> => {
  try {
    const codigo = String(req.params.codigo);
    const Uid = String(req.params.Uid);
    const empresaCodigo = (req.query.empresa as string) || '';

    const plantilla = await PlantillaCertificado.findOne({ where: { codigo, activo: true } });
    if (!plantilla) return res.status(404).json({ msg: 'Plantilla de certificado no encontrada o inactiva' });

    const usuario: any = await User.findByPk(parseInt(Uid), { include: [{ model: Area, as: 'area' }] });
    if (!usuario) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const empresaCode = empresaCodigo || usuario.empresa || 'AP';
    const empresaData = await getEmpresaConfig(empresaCode);

    const fechaIngresoDate = usuario.fechaIngreso ? new Date(usuario.fechaIngreso) : new Date(usuario.createdAt || Date.now());
    const salario = usuario.salario || 0;

    // Fecha del certificado: usar la que viene en query, o hoy
    let fechaCertificadoTexto = formatDateSpanishLocal(new Date());
    if (req.query.fechaCertificado) {
      const fechaQ = new Date(String(req.query.fechaCertificado));
      if (!isNaN(fechaQ.getTime())) fechaCertificadoTexto = formatDateSpanishLocal(fechaQ);
    }

    const variables: Record<string, string> = {
      nombreCompleto: `${usuario.name} ${usuario.lastName}`,
      cedula: usuario.documentoIdentificacion || '',
      cargo: usuario.cargo || usuario.area?.Aname || '',
      empresa: empresaData.nombre || '',
      nit: empresaData.nit || '',
      gerente: empresaData.gerente || '',
      cedulaGerente: empresaData.cedulaGerente || '',
      cargoGerente: empresaData.cargo_gerente || 'Gerente General',
      fechaIngreso: formatDateSimpleLocal(fechaIngresoDate),
      salario: formatCurrencyLocal(salario),
      salarioEnPalabras: numberToWordsLocal(Math.floor(salario)),
      ciudad: 'Pereira',
      fechaCertificado: fechaCertificadoTexto,
      tipoContrato: usuario.tipoContrato === 'termino-fijo' ? 'término fijo' : 'término indefinido',
      fechaSalida: (req.query.fechaSalida as string) || '',
      // Cualquier query param adicional del usuario
      ...Object.fromEntries(
        Object.entries(req.query)
          .filter(([k]) => !['empresa', 'fechaSalida', 'fechaCertificado'].includes(k))
          .map(([k, v]) => [k, String(v)])
      ),
    };

    // Generar dos versiones: con firma (para imprimir) y sin firma (digital)
    const canvasSinFirma = await generarCanvasDesdeTemplate(plantilla, usuario, empresaData, empresaCode, variables, false);
    const canvasConFirma  = await generarCanvasDesdeTemplate(plantilla, usuario, empresaData, empresaCode, variables, true);

    await sendMultipleCanvasAsPdf(res, [canvasSinFirma, canvasConFirma], `certificado_${codigo}_${Uid}`);

  } catch (error: any) {
    console.error('Error generando PDF desde plantilla:', error);
    res.status(500).json({ msg: 'Error al generar el PDF', error: error.message });
  }
};
