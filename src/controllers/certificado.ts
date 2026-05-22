import { parseId } from '../utils/parseId'
import { Request, Response } from "express";
import { User } from "../models/user";
import { Area } from "../models/area";
import { createCanvas, loadImage, registerFont } from "canvas";
import PdfPrinter from 'pdfmake';
import path from "path";
import fs from "fs";
import NominaConfig from "../models/nominaConfig";

// Función para formatear números a pesos colombianos
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Función mejorada para convertir número a palabras
const numberToWords = (num: number): string => {
  const units = [
    "",
    "un",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const tens = [
    "",
    "",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const hundreds = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];
  const teens = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];

  if (num === 0) return "cero";
  if (num === 100) return "cien";

  let words = "";

  // Millones
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) {
      words += "un millón ";
    } else {
      words += numberToWords(millions) + " millones ";
    }
    num %= 1000000;
  }

  // Miles
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      words += "mil ";
    } else {
      words += numberToWords(thousands) + " mil ";
    }
    num %= 1000;
  }

  // Centenas
  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)] + " ";
    num %= 100;
  }

  // Decenas y unidades
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    if (num % 10 > 0) {
      words += " y " + units[num % 10];
    }
  } else if (num >= 10) {
    words += teens[num - 10];
  } else if (num > 0) {
    words += units[num];
  }

  return words.trim().charAt(0).toUpperCase() + words.trim().slice(1);
};

// Helper: convierte un canvas a PNG buffer, lo envuelve en un PDF y lo envía al cliente
const sendCanvasAsPdf = async (res: Response, canvas: any, filenameBase: string) => {
  const buffer = canvas.toBuffer('image/png');
  const imageData = 'data:image/png;base64,' + buffer.toString('base64');

  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  const printer = new PdfPrinter(fonts);
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    content: [ { image: imageData, width: 595 } ],
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: any[] = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', (err: any) => reject(err));
    pdfDoc.end();
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
  res.send(pdfBuffer);
};

// Helper: convierte múltiples canvas en un solo PDF de varias páginas
const sendMultipleCanvasAsPdf = async (res: Response, canvases: any[], filenameBase: string) => {
  try {
    console.log(`📄 Generando PDF múltiple con ${canvases.length} páginas...`);
    
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);
    
    // Crear contenido con todas las imágenes, cada una en una página separada
    const content: any[] = [];
    for (let index = 0; index < canvases.length; index++) {
      const canvas = canvases[index];
      console.log(`  📝 Procesando canvas ${index + 1}...`);
      // Usar JPEG con calidad reducida para evitar PDFs muy grandes
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
      const imageData = 'data:image/jpeg;base64,' + buffer.toString('base64');
      console.log(`  📝 Canvas ${index + 1} convertido, tamaño buffer: ${buffer.length} bytes`);
      
      if (index > 0) {
        // Agregar salto de página antes de cada imagen excepto la primera
        content.push({ image: imageData, width: 595, pageBreak: 'before' });
      } else {
        content.push({ image: imageData, width: 595 });
      }
    }

    console.log(`  ✅ Contenido creado, generando documento PDF...`);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [0, 0, 0, 0],
      content: content,
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: any[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    });

    console.log(`  ✅ PDF generado, tamaño: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('❌ Error en sendMultipleCanvasAsPdf:', error);
    throw error;
  }
};

// Función para formatear fecha en español
const formatDateSpanish = (date: Date): string => {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  // Determinar si es 1 día o múltiples días
  const dayWord = day === 1 ? "día" : "días";

  return `${day} ${dayWord} del mes de ${month} de ${year}`;
};

// Función mejorada para formatear fechas de manera más simple y legible
const formatDateSimple = (date: Date): string => {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
};

// Función para formatear fecha en formato "X días del mes de Y de Z"
const formatDateForSignature = (date: Date): string => {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} días del mes de ${month} de ${year}`;
};

// Datos de las empresas
const empresasData: any = {
  AP: {
    nombre: "ANDRES PUBLICIDAD TG SAS",
    nit: "NIT 901.458.142-2",
    gerente: "Carlos Andrés Tobón Agudelo",
    cedulaGerente: "1088254149",
    direccion: "Pereira, Risaralda - Colombia",
    telefono: "(+57) 300 392 1721",
    email: "andrespublicidad@andrespublicidadtg.com",
    logo: "Logo2.png",
    watermark: "iso.png",
    headerColor: "#000000",
    accentColor: "#1a5490",
  },
  AT: {
    nombre: "ANDRÉS TOBÓN",
    nit: "",
    gerente: "Carlos Andrés Tobón Agudelo",
    cedulaGerente: "1088254149",
    direccion: "Pereira, Risaralda - Colombia",
    telefono: "(+57) 300 392 1721",
    email: "andres.tobonag87@gmail.com",
    logo: "Logo1.png",
    watermark: "LogoAT.png",
    headerColor: "#000000",
    accentColor: "#333333",
  },
  ME: {
    nombre: "MARIA EVANGELINA AGUDELO GIL",
    nit: "CC. 42094435",
    gerente: "María Evangelina Agudelo Gil",
    cedulaGerente: "42094435",
    direccion: "",
    telefono: "(+57) 300 392 1721",
    email: "maria.eva.agudelo@hotmail.com",
    logo: "Logo3.png",
    watermark: "FAVICON.png",
    headerColor: "#C9A053",
    accentColor: "#C9A053",
  },
};

// Generar certificado laboral (JSON)
export const generarCertificadoLaboral = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;

  try {
    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    const empresaData = empresasData[usuario.empresa || "AP"];

    const salarioFormateado = formatCurrency(usuario.salario || 0);
    const salarioEnPalabras = numberToWords(Math.floor(usuario.salario || 0));

    // Obtener la fecha de ingreso correcta
    const fechaIngresoReal = usuario.fechaIngreso 
      ? new Date(usuario.fechaIngreso) 
      : new Date(usuario.createdAt || Date.now());

    const certificado = {
      empresa: empresaData.nombre,
      nit: empresaData.nit,
      nombreCompleto: `${usuario.name} ${usuario.lastName}`,
      documentoIdentificacion: usuario.documentoIdentificacion || "N/A",
      cargo: usuario.cargo || usuario.area?.Aname || "Sin cargo asignado",
      fechaIngreso: formatDateSimple(fechaIngresoReal),
      salario: salarioFormateado,
      salarioEnPalabras: salarioEnPalabras,
      fechaCertificado: formatDateSpanish(new Date()),
      gerente: empresaData.gerente,
      direccion: empresaData.direccion,
      telefono: empresaData.telefono,
      email: empresaData.email,
      logo: empresaData.logo,
      tipoContrato: usuario.tipoContrato === 'termino-fijo' ? 'a término fijo' : 'a término indefinido',
    };

    res.status(200).json({
      message: "Certificado generado exitosamente",
      certificado,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al generar el certificado",
      message: error.message || error,
    });
  }
};

// Helper: elimina el fondo blanco de una imagen (JPG/JPEG sin transparencia)
async function drawImageTransparent(
  ctx: any,
  imgPath: string,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  threshold = 230
): Promise<void> {
  const img = await loadImage(imgPath);
  const off = createCanvas(Math.round(dw), Math.round(dh));
  const offCtx = off.getContext('2d');
  offCtx.drawImage(img, 0, 0, Math.round(dw), Math.round(dh));
  const imageData = offCtx.getImageData(0, 0, Math.round(dw), Math.round(dh));
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i + 1] >= threshold && d[i + 2] >= threshold) {
      d[i + 3] = 0; // píxel casi blanco → transparente
    }
  }
  offCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(off, dx, dy, dw, dh);
}

// Función auxiliar para escribir texto con wrapping
function wrapText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yPos = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, yPos);
      line = words[n] + " ";
      yPos += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, yPos);
  return yPos;
}

// Función auxiliar para escribir texto justificado
function wrapTextJustified(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let lines: string[] = [];
  let line = "";

  // Primero, dividir el texto en líneas
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim()); // Última línea

  let yPos = y;

  // Dibujar cada línea
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const lineWords = currentLine.split(" ");
    
    // La última línea no se justifica
    if (i === lines.length - 1 || lineWords.length === 1) {
      ctx.fillText(currentLine, x, yPos);
    } else {
      // Justificar la línea
      const totalWordsWidth = lineWords.reduce((acc, word) => acc + ctx.measureText(word).width, 0);
      const totalSpaceWidth = maxWidth - totalWordsWidth;
      const spaceWidth = totalSpaceWidth / (lineWords.length - 1);
      
      let currentX = x;
      for (let j = 0; j < lineWords.length; j++) {
        ctx.fillText(lineWords[j], currentX, yPos);
        currentX += ctx.measureText(lineWords[j]).width + spaceWidth;
      }
    }
    yPos += lineHeight;
  }
  
  return yPos - lineHeight; // Retornar la posición Y de la última línea
}

// Función para obtener festivos de Colombia 2025-2026
function getFestivosColombia(year: number): Date[] {
  const festivos: Date[] = [];
  
  if (year === 2025) {
    // Festivos fijos 2025
    festivos.push(new Date(2025, 0, 1));   // 1 Enero - Año Nuevo
    festivos.push(new Date(2025, 0, 6));   // 6 Enero - Reyes Magos
    festivos.push(new Date(2025, 2, 24));  // 24 Marzo - San José (trasladado al lunes)
    festivos.push(new Date(2025, 3, 17));  // 17 Abril - Jueves Santo
    festivos.push(new Date(2025, 3, 18));  // 18 Abril - Viernes Santo
    festivos.push(new Date(2025, 4, 1));   // 1 Mayo - Día del Trabajo
    festivos.push(new Date(2025, 4, 19));  // 19 Mayo - Ascensión (trasladado al lunes)
    festivos.push(new Date(2025, 5, 9));   // 9 Junio - Corpus Christi (trasladado al lunes)
    festivos.push(new Date(2025, 5, 16));  // 16 Junio - Sagrado Corazón (trasladado al lunes)
    festivos.push(new Date(2025, 5, 23));  // 23 Junio - San Pedro y San Pablo (trasladado al lunes)
    festivos.push(new Date(2025, 6, 20));  // 20 Julio - Independencia
    festivos.push(new Date(2025, 7, 7));   // 7 Agosto - Batalla de Boyacá
    festivos.push(new Date(2025, 7, 18));  // 18 Agosto - Asunción (trasladado al lunes)
    festivos.push(new Date(2025, 9, 13));  // 13 Octubre - Día de la Raza (trasladado al lunes)
    festivos.push(new Date(2025, 10, 3));  // 3 Noviembre - Todos los Santos (trasladado al lunes)
    festivos.push(new Date(2025, 10, 17)); // 17 Noviembre - Independencia de Cartagena (trasladado al lunes)
    festivos.push(new Date(2025, 11, 8));  // 8 Diciembre - Inmaculada Concepción
    festivos.push(new Date(2025, 11, 25)); // 25 Diciembre - Navidad
  } else if (year === 2026) {
    // Festivos fijos 2026
    festivos.push(new Date(2026, 0, 1));   // 1 Enero - Año Nuevo
    festivos.push(new Date(2026, 0, 12));  // 12 Enero - Reyes Magos (trasladado)
    festivos.push(new Date(2026, 2, 23));  // 23 Marzo - San José (trasladado)
    festivos.push(new Date(2026, 3, 2));   // 2 Abril - Jueves Santo
    festivos.push(new Date(2026, 3, 3));   // 3 Abril - Viernes Santo
    festivos.push(new Date(2026, 4, 1));   // 1 Mayo - Día del Trabajo
    festivos.push(new Date(2026, 4, 18));  // 18 Mayo - Ascensión (trasladado)
    festivos.push(new Date(2026, 5, 8));   // 8 Junio - Corpus Christi (trasladado)
    festivos.push(new Date(2026, 5, 15));  // 15 Junio - Sagrado Corazón (trasladado)
    festivos.push(new Date(2026, 5, 29));  // 29 Junio - San Pedro y San Pablo (trasladado)
    festivos.push(new Date(2026, 6, 20));  // 20 Julio - Independencia
    festivos.push(new Date(2026, 7, 7));   // 7 Agosto - Batalla de Boyacá
    festivos.push(new Date(2026, 7, 17));  // 17 Agosto - Asunción (trasladado)
    festivos.push(new Date(2026, 9, 12));  // 12 Octubre - Día de la Raza (trasladado)
    festivos.push(new Date(2026, 10, 2));  // 2 Noviembre - Todos los Santos (trasladado)
    festivos.push(new Date(2026, 10, 16)); // 16 Noviembre - Independencia de Cartagena (trasladado)
    festivos.push(new Date(2026, 11, 8));  // 8 Diciembre - Inmaculada Concepción
    festivos.push(new Date(2026, 11, 25)); // 25 Diciembre - Navidad
  }
  
  return festivos;
}

// Función auxiliar para obtener el siguiente lunes (ya no se usa, festivos fijos arriba)
function getSiguienteLunes(fecha: Date): Date {
  const dia = fecha.getDay();
  if (dia === 1) return fecha; // Ya es lunes
  const diasHastaLunes = dia === 0 ? 1 : 8 - dia;
  const siguienteLunes = new Date(fecha);
  siguienteLunes.setDate(fecha.getDate() + diasHastaLunes);
  return siguienteLunes;
}

// Función para verificar si una fecha es festivo
function esFestivo(fecha: Date, festivos: Date[]): boolean {
  return festivos.some(festivo => 
    festivo.getFullYear() === fecha.getFullYear() &&
    festivo.getMonth() === fecha.getMonth() &&
    festivo.getDate() === fecha.getDate()
  );
}

// Función para calcular días laborales entre dos fechas
function calcularDiasLaborales(fechaInicio: Date, fechaFin: Date): number {
  let diasLaborales = 0;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  // Obtener festivos para los años involucrados
  const yearInicio = inicio.getFullYear();
  const yearFin = fin.getFullYear();
  let festivos: Date[] = getFestivosColombia(yearInicio);
  if (yearFin !== yearInicio) {
    festivos = festivos.concat(getFestivosColombia(yearFin));
  }
  
  console.log(`\n📅 === CÁLCULO DE DÍAS LABORALES ===`);
  console.log(`Desde: ${inicio.toLocaleDateString('es-CO')} hasta ${fin.toLocaleDateString('es-CO')}`);
  console.log(`Festivos cargados: ${festivos.length}`);
  
  // Iterar día por día
  const currentDate = new Date(inicio);
  let contadorDias = 0;
  
  while (currentDate <= fin) {
    contadorDias++;
    const diaSemana = currentDate.getDay();
    const diaStr = currentDate.toLocaleDateString('es-CO');
    const esFestivoHoy = esFestivo(currentDate, festivos);
    
    let esLaboral = false;
    let razon = '';
    
    // Verificar si es día laboral
    if (diaSemana === 0) {
      // Domingo - NO es laboral
      razon = '❌ Domingo';
    } else if (diaSemana === 6) {
      // Sábado - NO es laboral (ya no se cuenta ningún sábado)
      razon = '❌ Sábado';
    } else {
      // Lunes a Viernes - es laboral si no es festivo
      if (!esFestivoHoy) {
        esLaboral = true;
        razon = '✅ Día laboral';
        diasLaborales++;
      } else {
        razon = '❌ Festivo';
      }
    }
    
    // Log detallado solo para los primeros 10 días y últimos 5
    if (contadorDias <= 10 || (fin.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24) <= 5) {
      console.log(`  ${diaStr} - ${razon}`);
    }
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`  Total días en período: ${contadorDias}`);
  console.log(`  Días laborales: ${diasLaborales}`);
  console.log(`  Días no laborales: ${contadorDias - diasLaborales}`);
  console.log(`===================================\n`);
  
  return diasLaborales;
}

// ==========================================
// HELPER: DIBUJAR MEMBRETE COMPLETO (fondo, stripe, watermark, logo)
// Retorna la posición Y inferior del área de encabezado
// ==========================================
const drawLetterhead = async (
  ctx: any,
  width: number,
  height: number,
  empresaData: any,
  empresa: string
): Promise<number> => {
  // 1. Fondo blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Barra lateral izquierda vertical (AT y AP)
  if (empresa === 'AP' || empresa === 'AT') {
    const stripeW = 38;
    ctx.fillStyle = empresa === 'AT' ? '#0d2a35' : '#111111';
    ctx.fillRect(0, 0, stripeW, height);
    if (empresa === 'AP') {
      // Sección amarilla al fondo de la barra (estilo AndresPublicidad)
      ctx.fillStyle = '#FFCC00';
      ctx.fillRect(0, height - 260, stripeW, 260);
    }
  }

  // 3. Decoraciones de encabezado para ME (trapecios dorados arriba)
  if (empresa === 'ME') {
    const color = empresaData.accentColor || '#C9A053';
    const decorH = 62;
    const decorW = 540;
    ctx.fillStyle = color;
    // Trapecio izquierdo
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(decorW, 0);
    ctx.lineTo(decorW - 90, decorH);
    ctx.lineTo(0, decorH);
    ctx.closePath();
    ctx.fill();
    // Trapecio derecho (espejo)
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width - decorW, 0);
    ctx.lineTo(width - decorW + 90, decorH);
    ctx.lineTo(width, decorH);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Marca de agua centrada (muy transparente) — solo AP y ME
  const watermarkFile = empresaData.watermark || empresaData.logo;
  const watermarkPath = path.join(__dirname, '../../public', watermarkFile);
  if (fs.existsSync(watermarkPath)) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.07;
      const wm = await loadImage(watermarkPath);
      const wmSize = empresa === 'AT' ? 2200 : 1800;
      const wmH = (wm.height / wm.width) * wmSize;
      const wmX = (width - wmSize) / 2;
      const wmY = (height - wmH) / 2;
      // Para AT: recortar para mostrar solo el símbolo (parte superior ~62%)
      if (empresa === 'AT') {
        ctx.beginPath();
        ctx.rect(wmX, wmY, wmSize, wmH * 0.62);
        ctx.clip();
      }
      // Para AP: desplazada a la izquierda y rotada a la derecha
      if (empresa === 'AP') {
        ctx.translate(width * 0.35, height / 2);
        ctx.rotate(12 * Math.PI / 180);
        ctx.drawImage(wm, -wmSize * 0.65, -wmH * 0.65, wmSize * 1.8, wmH * 1.8);
      } else {
        ctx.drawImage(wm, wmX, wmY, wmSize, wmH);
      }
      ctx.restore();
    } catch (err) {
      console.error('Error watermark:', err);
    }
  }

  // 5. Logo centrado en la parte superior
  const logoPath = path.join(__dirname, '../../public', empresaData.logo);
  let logoBottomY = 250;
  if (fs.existsSync(logoPath)) {
    try {
      const logo = await loadImage(logoPath);
      const logoWidth = empresa === 'ME' ? 550 : 500;
      const logoH = (logo.height / logo.width) * logoWidth;
      const logoY = empresa === 'ME' ? 120 : 100;

      ctx.drawImage(logo, (width - logoWidth) / 2, logoY, logoWidth, logoH);

      logoBottomY = logoY + logoH;
    } catch (err) {
      console.error('Error logo:', err);
    }
  }

  return logoBottomY;
};

// ==========================================
// HELPER: DIBUJAR BARRA DE PIE DE PÁGINA
// ==========================================
const drawFooterBar = async (
  ctx: any,
  width: number,
  height: number,
  empresaData: any,
  empresa: string
): Promise<void> => {
  const footerH = 138;
  const footerY = height - footerH;
  let bgColor = '#111111'; // AP: negro
  if (empresa === 'AT') bgColor = '#0d2a35';
  if (empresa === 'ME') bgColor = empresaData.accentColor || '#C9A053';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, footerY, width, footerH);

  const textY = footerY + Math.round(footerH * 0.63);
  const iconSize = 52;
  const iconTextGap = 18;
  const itemGap = 100;

  // Ícono de ubicación (pin de mapa)
  const drawPinIcon = (x: number, cy: number) => {
    const r = iconSize * 0.38;
    const cx2 = x + iconSize / 2;
    const topY = cy - iconSize * 0.55;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx2, topY + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx2 - r * 0.8, topY + r * 1.2);
    ctx.lineTo(cx2 + r * 0.8, topY + r * 1.2);
    ctx.lineTo(cx2, cy + iconSize * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(cx2, topY + r, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Ícono de teléfono (auricular)
  const drawPhoneIcon = (x: number, cy: number) => {
    const cx2 = x + iconSize / 2;
    ctx.save();
    const r = iconSize * 0.17;
    // Pieza superior (auricular)
    const earX = cx2 + iconSize * 0.18;
    const earY = cy - iconSize * 0.28;
    // Pieza inferior (micrófono)
    const mouthX = cx2 - iconSize * 0.18;
    const mouthY = cy + iconSize * 0.28;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(earX, earY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = iconSize * 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(earX, earY);
    ctx.bezierCurveTo(earX, cy, mouthX, cy, mouthX, mouthY);
    ctx.stroke();
    ctx.restore();
  };

  // Ícono de email (sobre)
  const drawMailIcon = (x: number, cy: number) => {
    const topY = cy - iconSize * 0.38;
    const bH = iconSize * 0.62;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = iconSize * 0.09;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x, topY, iconSize, bH);
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x + iconSize / 2, topY + bH * 0.52);
    ctx.lineTo(x + iconSize, topY);
    ctx.stroke();
    ctx.restore();
  };

  // Construir items según empresa
  const items: { type: string; text: string }[] = [];
  if (empresa !== 'ME' && empresaData.direccion) {
    items.push({ type: 'location', text: empresaData.direccion });
  }
  if (empresaData.telefono) {
    items.push({ type: empresa === 'ME' ? 'whatsapp' : 'phone', text: empresaData.telefono });
  }
  if (empresaData.email) {
    items.push({ type: 'mail', text: empresaData.email });
  }

  // Medir ancho total para centrar
  ctx.font = 'bold 38px Arial';
  let totalW = 0;
  items.forEach((item, i) => {
    totalW += iconSize + iconTextGap + ctx.measureText(item.text).width;
    if (i < items.length - 1) totalW += itemGap;
  });

  let currentX = (width - totalW) / 2;
  items.forEach((item) => {
    if (item.type === 'location') drawPinIcon(currentX, textY);
    else if (item.type === 'phone' || item.type === 'whatsapp') drawPhoneIcon(currentX, textY);
    else if (item.type === 'mail') drawMailIcon(currentX, textY);
    currentX += iconSize + iconTextGap;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 38px Arial';
    ctx.fillText(item.text, currentX, textY);
    currentX += ctx.measureText(item.text).width + itemGap;
  });
};

// Generar certificado como IMAGEN
// Generar certificado como IMAGEN
export const generarCertificadoImagen = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;

  try {
    console.log("=== INICIANDO GENERACIÓN DE CERTIFICADO IMAGEN ===");
    console.log("Usuario ID:", Uid);

    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      console.log("❌ Usuario no encontrado");
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    console.log("✅ Usuario encontrado:", usuario.name, usuario.lastName);
    console.log("Empresa:", usuario.empresa);

    const empresaData = empresasData[usuario.empresa || "AP"];
    console.log("Datos empresa:", empresaData);

    const salarioFormateado = formatCurrency(usuario.salario || 0);
    const salarioEnPalabras = numberToWords(Math.floor(usuario.salario || 0));
    const fechaCertificado = formatDateSpanish(new Date());
    
    // Usar fechaIngreso del usuario, no createdAt
    const fechaIngresoReal = usuario.fechaIngreso 
      ? new Date(usuario.fechaIngreso) 
      : new Date(usuario.createdAt || Date.now());
    const fechaIngreso = formatDateSimple(fechaIngresoReal);

    // Crear canvas (tamaño A4 en píxeles: 2480 x 3508 a 300 DPI)
    console.log("📄 Creando canvas...");
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    console.log("✅ Canvas creado");

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const empresa = usuario.empresa || 'AP';
    const headerBottomY = await drawLetterhead(ctx, width, height, empresaData, empresa);

    // ========================================
    // TÍTULO "CERTIFICADO LABORAL" - MÁS PEQUEÑO
    // ========================================
    ctx.fillStyle = "#000000";
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";

    let tituloY = 900; // Bajar más el título para todos
    if (usuario.empresa === "ME") tituloY = 950;

    ctx.fillText("CERTIFICADO LABORAL", width / 2, tituloY);

    // ========================================
    // NOMBRE Y NIT DE LA EMPRESA
    // ========================================
    ctx.font = "bold 52px Arial";
    ctx.fillStyle = "#000000";
    
    let nombreY = tituloY + 120;
    if (usuario.empresa === "ME") nombreY = tituloY + 140;
    
    ctx.fillText(empresaData.nombre, width / 2, nombreY);

    if (empresaData.nit) {
      ctx.font = "bold 44px Arial";
      let nitY = nombreY + 70;
      ctx.fillText(empresaData.nit, width / 2, nitY);
    }

    // ========================================
    // CONTENIDO DEL CERTIFICADO - MUCHO MÁS CENTRADO
    // ========================================
    ctx.textAlign = "left";
    ctx.font = "42px Arial";
    const marginLeft = 300;
    const marginRight = 300;
    const contentWidth = width - marginLeft - marginRight;

    let yPos = tituloY + 450; // Mucho más espacio para centrar mejor el contenido
    if (usuario.empresa === "ME") yPos = tituloY + 480;

    // Construir el texto del certificado
    // Usar cargo (rol) en lugar de area
    const cargoUsuario = usuario.cargo || "Sin cargo asignado";
    
    const parrafo1 = `Por medio de la presente, hacemos constar que el (la) señor (a) ${usuario.name.toUpperCase()} ${usuario.lastName.toUpperCase()}, identificado (a) con CÉDULA DE CIUDADANÍA ${
      usuario.documentoIdentificacion
    }, labora en nuestra empresa como ${cargoUsuario} desde el ${fechaIngreso}, con un contrato a término indefinido y devengando un salario mensual de ${salarioFormateado} (${salarioEnPalabras} pesos).`;

    ctx.font = "42px Arial";
    ctx.fillStyle = "#000000";
    yPos = wrapText(ctx, parrafo1, marginLeft, yPos, contentWidth, 70) + 100;

    // Párrafo 2
    const parrafo2 = `Para constancia, se firma a los ${fechaCertificado}.`;
    wrapText(ctx, parrafo2, marginLeft, yPos, contentWidth, 70);

    // ========================================
    // SECCIÓN DE FIRMAS - MUCHO MÁS ABAJO
    // ========================================
    const firmaY = height - 550; // Casi al final de la página
    const firmaIzqX = width * 0.3;  // Firma IZQUIERDA (Gerente)
    const firmaDerX = width * 0.7;  // Firma DERECHA (Líder)
    const firmaCentroX = width / 2; // Firma CENTRADA (para una sola firma)

    // Líneas de firma
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;

    // ========================================
    // SI ES ME: DOS FIRMAS (GERENTE + LÍDER)
    // ========================================
    if (usuario.empresa === "ME") {
      // FIRMA CENTRADA - MARÍA EVANGELINA
      const firmaMEPath = path.join(__dirname, "../../public/F- (3).png");
      if (fs.existsSync(firmaMEPath)) {
        try {
          const firmaWidth = 350;
          const firmaMEImg = await loadImage(firmaMEPath);
          const firmaHeight = (firmaMEImg.height / firmaMEImg.width) * firmaWidth;
          await drawImageTransparent(ctx, firmaMEPath, firmaCentroX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
        } catch (err) {
          console.warn("Error al cargar F- (3).png:", err);
        }
      }

      ctx.beginPath();
      ctx.moveTo(firmaCentroX - 300, firmaY);
      ctx.lineTo(firmaCentroX + 300, firmaY);
      ctx.stroke();

      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.fillText(empresaData.gerente, firmaCentroX, firmaY + 55);
      ctx.font = "36px Arial";
      ctx.fillText("Gerente General", firmaCentroX, firmaY + 100);

      // Contacto centrado - MUCHO MÁS ABAJO
      // ========================================
      // PIE DE PÁGINA ME (barra dorada con iconos)
      // ========================================
      await drawFooterBar(ctx, width, height, empresaData, empresa);
    } else {
      // ========================================
      // FIRMA CENTRADA - GERENTE GENERAL (AP/AT)
      // ========================================
      const firmaIzqPath = path.join(__dirname, "../../public/F- (2).png");
      if (fs.existsSync(firmaIzqPath)) {
        try {
          const firmaIzqImg = await loadImage(firmaIzqPath);
          const firmaWidth = 350;
          const firmaHeight = (firmaIzqImg.height / firmaIzqImg.width) * firmaWidth;
          await drawImageTransparent(ctx, firmaIzqPath, firmaCentroX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
        } catch (err) {
          console.warn("Error al cargar F- (2).png:", err);
        }
      }

      ctx.beginPath();
      ctx.moveTo(firmaCentroX - 300, firmaY);
      ctx.lineTo(firmaCentroX + 300, firmaY);
      ctx.stroke();

      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.fillText(empresaData.gerente, firmaCentroX, firmaY + 55);
      ctx.font = "36px Arial";
      ctx.fillText("Gerente General", firmaCentroX, firmaY + 100);

      // ========================================
      // PIE DE PÁGINA (barra coloreada con iconos)
      // ========================================
      await drawFooterBar(ctx, width, height, empresaData, empresa);

    }

    // Enviar como PDF usando helper
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    await sendCanvasAsPdf(res, canvas, `certificado_${usuario.name}_${usuario.lastName}`);
  } catch (error: any) {
    console.error("❌❌❌ ERROR GENERANDO CERTIFICADO:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      error: "Error al generar el certificado",
      message: error.message || error,
    });
  }
};

// Mantener el HTML para vista previa (opcional)
export const generarCertificadoHTML = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;

  try {
    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    const empresaData = empresasData[usuario.empresa || "AP"];
    const salarioFormateado = formatCurrency(usuario.salario || 0);
    const salarioEnPalabras = numberToWords(Math.floor(usuario.salario || 0));
    const fechaCertificado = formatDateSpanish(new Date());
    
    // Usar fechaIngreso del usuario, no createdAt
    const fechaIngresoReal = usuario.fechaIngreso 
      ? new Date(usuario.fechaIngreso) 
      : new Date(usuario.createdAt || Date.now());
    const fechaIngreso = formatDateSimple(fechaIngresoReal);
    
    // Usar cargo (rol) en lugar de area
    const cargoUsuario = usuario.cargo || usuario.area?.Aname || "Sin cargo";

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado Laboral</title>
      <style>
        @page { size: A4; margin: 0; }
        body {
          font-family: 'Arial', sans-serif;
          max-width: 21cm;
          margin: 0 auto;
          padding: 2cm;
          line-height: 1.6;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .logo {
          max-width: 250px;
          height: auto;
          margin-bottom: 30px;
        }
        .decorative-line {
          height: 10px;
          background: ${empresaData.headerColor};
          margin: 20px 0;
        }
        h1 {
          font-size: 28px;
          font-weight: bold;
          margin: 30px 0;
          text-transform: uppercase;
        }
        .empresa-info {
          text-align: center;
          font-weight: bold;
          margin-bottom: 40px;
          font-size: 16px;
        }
        .content {
          text-align: justify;
          margin: 40px 0;
          font-size: 14px;
          line-height: 2;
        }
        .content strong {
          font-weight: bold;
        }
        .footer {
          margin-top: 100px;
          display: flex;
          justify-content: space-around;
          align-items: flex-start;
        }
        .firma {
          text-align: center;
          width: 40%;
        }
        .linea-firma {
          border-top: 2px solid #000;
          margin: 80px auto 15px;
          width: 100%;
        }
        .firma-nombre {
          font-weight: bold;
          margin: 5px 0;
          font-size: 14px;
        }
        .firma-cargo {
          margin: 3px 0;
          font-size: 13px;
        }
        .firma-contacto {
          font-size: 11px;
          margin: 2px 0;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/public/${
          empresaData.logo
        }" alt="Logo" class="logo" onerror="this.style.display='none'">
        ${usuario.empresa === "ME" ? '<div class="decorative-line"></div>' : ""}
        <h1>CERTIFICADO LABORAL</h1>
        <div class="empresa-info">
          <div>${empresaData.nombre}</div>
          ${empresaData.nit ? `<div>${empresaData.nit}</div>` : ""}
        </div>
      </div>

      <div class="content">
        <p>
          Por medio de la presente, hacemos constar que el (la) señor (a) 
          <strong>${usuario.name.toUpperCase()} ${usuario.lastName.toUpperCase()}</strong>, 
          identificado (a) con <strong>CÉDULA DE CIUDADANÍA ${
            usuario.documentoIdentificacion || "N/A"
          }</strong>; 
          labora en nuestra empresa como <strong>${cargoUsuario}</strong> 
          desde el <strong>${fechaIngreso}</strong>; 
          con un contrato a término indefinido y devengando un salario mensual de 
          <strong>${salarioFormateado} (${salarioEnPalabras} pesos)</strong>.
        </p>

        <p>
          Para constancia, se firma a los <strong>${fechaCertificado}</strong>.
        </p>
      </div>

      <div class="footer">
        <div class="firma">
          <div class="linea-firma"></div>
          <p class="firma-nombre">${empresaData.gerente}</p>
          <p class="firma-cargo">Gerente General</p>
          ${
            empresaData.direccion
              ? `<p class="firma-contacto">${empresaData.direccion}</p>`
              : ""
          }
          ${
            empresaData.telefono
              ? `<p class="firma-contacto">${empresaData.telefono}</p>`
              : ""
          }
          ${
            empresaData.email
              ? `<p class="firma-contacto">${empresaData.email}</p>`
              : ""
          }
        </div>
      </div>
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Error al generar el certificado HTML",
      message: error.message || error,
    });
  }
};

// ========================================
// CERTIFICADO DE AUTORIZACIÓN DE RETIRO DE CESANTÍAS
// ========================================

// Helper interno para generar el canvas del certificado de cesantías
const generarCanvasCesantias = async (
  usuario: any,
  empresaData: any,
  empresaSeleccionada: string,
  params: {
    nombreCompleto: string;
    cedula: string;
    fondoCesantias: string;
    tipoRetiro: string;
    conceptoRetiro: string;
    valorAutorizado: string;
    causa: string;
    fechaRetiroCesantias: string;
  },
  conFirma: boolean
): Promise<any> => {
  const width = 2480;
  const height = 3508;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ========================================
  // MEMBRETE: fondo + stripe + watermark + logo
  // ========================================
  const logoBottomCes = await drawLetterhead(ctx, width, height, empresaData, empresaSeleccionada);

  // Fecha
  ctx.font = "44px 'Helvetica'";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  let fechaRetiroFormateada = params.fechaRetiroCesantias;
  if (params.fechaRetiroCesantias.includes('-')) {
    const [year, month, day] = params.fechaRetiroCesantias.split('-');
    fechaRetiroFormateada = `${day}/${month}/${year}`;
  }
  
  const fechaY = logoBottomCes + 100;
  ctx.fillText(`Pereira, ${fechaRetiroFormateada}`, 200, fechaY);

  let yPos = fechaY + 170;

  // Título "Señores"
  ctx.font = "44px 'Helvetica'";
  ctx.fillText("Señores", 200, yPos);
  yPos += 55;
  ctx.font = "bold 44px 'Helvetica'";
  ctx.fillText(params.fondoCesantias.toUpperCase(), 200, yPos);

  yPos += 140;

  // Referencia
  ctx.font = "44px 'Helvetica'";
  ctx.fillText("Referencia: ", 200, yPos);
  ctx.font = "bold 44px 'Helvetica'";
  ctx.fillText("AUTORIZACIÓN DE RETIRO DE CESANTÍAS.", 450, yPos);

  yPos += 140;

  // Primer párrafo
  const marginLeft = 200;
  const contentWidth = width - 400;

  ctx.font = "42px 'Helvetica'";
  ctx.textAlign = "left";
  const texto = `Mediante el presente documento yo ${empresaData.gerente.toUpperCase()} identificado con cedula de ciudadanía número ${empresaData.cedulaGerente} y con domicilio en Pereira, actuando en calidad de empleador, con razón social ${empresaData.nombre}${empresaData.nit ? ' ' + empresaData.nit : ''} me permito informar que he AUTORIZADO el ${params.tipoRetiro.toUpperCase()} de cesantías del trabajador (a) así,`;
  
  yPos = wrapText(ctx, texto, marginLeft, yPos, contentWidth, 65);

  yPos += 150;

  // EMPLEADO
  ctx.font = "42px 'Helvetica'";
  ctx.fillText(`EMPLEADO: ${params.nombreCompleto.toUpperCase()}`, marginLeft, yPos);
  
  yPos += 75;
  ctx.fillText(`CEDULA DE CIUDADANIA: ${params.cedula}`, marginLeft, yPos);
  
  yPos += 75;
  ctx.fillText(`CONCEPTO DE RETIRO: ${params.conceptoRetiro.toUpperCase()}`, marginLeft, yPos);
  
  yPos += 75;
  ctx.fillText(`VALOR AUTORIZADO: ${params.valorAutorizado.toUpperCase()}`, marginLeft, yPos);
  
  yPos += 75;
  ctx.fillText(`CAUSA: ${params.causa.toUpperCase()}`, marginLeft, yPos);

  // Si es terminación de contrato y hay fecha de retiro, mostrarla
  if (params.conceptoRetiro.toUpperCase().includes('TERMINACIÓN') && params.fechaRetiroCesantias) {
    yPos += 75;
    let fechaRetiroFormateadaInner = params.fechaRetiroCesantias;
    if (params.fechaRetiroCesantias.includes('-')) {
      const [year, month, day] = params.fechaRetiroCesantias.split('-');
      fechaRetiroFormateadaInner = `${day}/${month}/${year}`;
    }
    ctx.fillText(`FECHA DE RETIRO DEL TRABAJADOR: ${fechaRetiroFormateadaInner}`, marginLeft, yPos);
  }

  yPos += 180;

  // Último párrafo
  const textoFinal = `Lo anterior de conformidad con lo establecido en el decreto 1072 de 2024, artículos 2.2.1.3.15 a 2.2.1.3.19 y el Decreto 1562 de 2019.`;
  wrapText(ctx, textoFinal, marginLeft, yPos, contentWidth, 65);

  // ========================================
  // FIRMA Y PIE DE PÁGINA
  // ========================================
  const firmaY = height - 650;

  if (conFirma) {
    // FIRMA DEL GERENTE (IZQUIERDA) - 20% del ancho
    const firmaGerenteX = width * 0.20;
    
    const firmaFileName = empresaSeleccionada === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, "../../public", firmaFileName);
    
    if (fs.existsSync(firmaPath)) {
      const firmaImg = await loadImage(firmaPath);
      const firmaWidth = 350;
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaGerenteX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaGerenteX - 350, firmaY);
    ctx.lineTo(firmaGerenteX + 350, firmaY);
    ctx.stroke();

    ctx.font = "bold 42px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillText(empresaData.gerente, firmaGerenteX, firmaY + 60);
    ctx.font = "38px 'Helvetica'";
    ctx.fillText(`Cédula: ${empresaData.cedulaGerente}`, firmaGerenteX, firmaY + 105);
    ctx.fillText("Representante Legal", firmaGerenteX, firmaY + 150);
    ctx.fillText(empresaData.nombre, firmaGerenteX, firmaY + 195);

    // FIRMA DEL EMPLEADO (DERECHA) - 80% del ancho
    const firmaEmpleadoX = width * 0.80;
    
    ctx.font = "40px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillText("FIRMA: _____________________________", firmaEmpleadoX, firmaY);
    ctx.fillText("CÉDULA: ____________________________", firmaEmpleadoX, firmaY + 100);
    
  } else {
    // SOLO FIRMA DEL GERENTE (CENTRADA)
    const firmaX = width / 2;
    
    const firmaFileName = empresaSeleccionada === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, "../../public", firmaFileName);
    
    if (fs.existsSync(firmaPath)) {
      const firmaImg = await loadImage(firmaPath);
      const firmaWidth = 350;
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaX - 350, firmaY);
    ctx.lineTo(firmaX + 350, firmaY);
    ctx.stroke();

    ctx.font = "bold 46px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.fillText(empresaData.gerente, firmaX, firmaY + 60);
    
    ctx.font = "42px 'Helvetica'";
    ctx.fillText(`Cédula: ${empresaData.cedulaGerente}`, firmaX, firmaY + 110);
    ctx.fillText("Representante Legal", firmaX, firmaY + 160);
    ctx.fillText(empresaData.nombre, firmaX, firmaY + 210);
  }

  // ========================================
  // PIE DE PÁGINA (barra coloreada con iconos)
  // ========================================
  await drawFooterBar(ctx, width, height, empresaData, empresaSeleccionada);

  return canvas;
};

export const generarCertificadoCesantias = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;
  const { empresa } = req.query;
  
  try {
    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    const empresaSeleccionada = (empresa as string) || usuario.empresa || "AP";
    const empresaData = empresasData[empresaSeleccionada];
    
    const params = {
      nombreCompleto: (req.query.nombreCompleto as string) || `${usuario.name} ${usuario.lastName}`,
      cedula: (req.query.cedula as string) || usuario.documentoIdentificacion,
      fondoCesantias: (req.query.fondoCesantias as string) || usuario.fondoCesantias || 'PORVENIR',
      valorAutorizado: (req.query.valorAutorizado as string) || 'RETIRO TOTAL',
      tipoRetiro: (req.query.tipoRetiro as string) || (req.query.valorAutorizado as string) || 'RETIRO TOTAL',
      conceptoRetiro: (req.query.conceptoRetiro as string) || 'TERMINACIÓN DEL CONTRATO DE TRABAJO',
      causa: (req.query.causa as string) || 'RETIRO CON INJUSTA CAUSA',
      fechaRetiroCesantias: (req.query.fechaRetiroCesantias as string) || '',
    };

    // Generar ambas versiones del certificado
    // Primero: versión SIN firma (digital)
    const canvasSinFirma = await generarCanvasCesantias(usuario, empresaData, empresaSeleccionada, params, false);
    // Segundo: versión CON firma (para firmar manualmente)
    const canvasConFirma = await generarCanvasCesantias(usuario, empresaData, empresaSeleccionada, params, true);

    // Incrementar contador de certificados generados (solo una vez)
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    console.log(`✅ Contador incrementado para ${usuario.name} ${usuario.lastName}: ${usuario.certificadosGenerados}`);

    // Enviar ambas versiones en un solo PDF (primero sin firma, luego con firma)
    await sendMultipleCanvasAsPdf(res, [canvasSinFirma, canvasConFirma], `cesantias_${Uid}`);

  } catch (error: any) {
    console.error("Error generando certificado de cesantías:", error);
    res.status(500).json({
      error: "Error al generar el certificado de cesantías",
      message: error.message || error,
    });
  }
};

// ========================================
// CERTIFICADO DE TERMINACIÓN DE CONTRATO
// ========================================

// Helper interno para generar el canvas del certificado de terminación
const generarCanvasTerminacion = async (
  usuario: any,
  empresaData: any,
  empresaSeleccionada: string,
  params: {
    nombreCompleto: string;
    cedula: string;
    cargo: string;
    fechaIngreso: string;
    fechaSalida: string;
    textoTerminacion: string;
  },
  conFirma: boolean
): Promise<any> => {
  const width = 2480;
  const height = 3508;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ========================================
  // MEMBRETE: fondo + stripe + watermark + logo
  // ========================================
  const logoBottomLab = await drawLetterhead(ctx, width, height, empresaData, empresaSeleccionada);

  // Título
  ctx.font = "bold 95px 'Helvetica'";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  
  const tituloY = logoBottomLab + 120;
  
  ctx.fillText("CERTIFICADO LABORAL", width / 2, tituloY);

  // Info empresa
  ctx.font = "bold 56px 'Helvetica'";
  ctx.fillText(empresaData.nombre, width / 2, tituloY + 200);
  if (empresaData.nit) {
    ctx.font = "bold 46px 'Helvetica'";
    ctx.fillText(empresaData.nit, width / 2, tituloY + 270);
  }

  // Contenido
  const marginLeft = 300;
  const contentWidth = width - 600;
  let yPos = tituloY + 450;

  ctx.textAlign = "left";
  ctx.font = "46px 'Helvetica'";
  
  const parrafo = `Por medio de la presente, hacemos constar que el (la) señor (a) ${params.nombreCompleto.toUpperCase()}, identificado (a) con CÉDULA DE CIUDADANÍA ${params.cedula}, ${params.textoTerminacion}`;
  
  yPos = wrapTextJustified(ctx, parrafo, marginLeft, yPos, contentWidth, 80) + 150;

  const parrafo2 = `Para constancia, se firma a los ${formatDateForSignature(new Date())}.`;
  wrapTextJustified(ctx, parrafo2, marginLeft, yPos, contentWidth, 80);

  // Firma
  const firmaY = height - 450;

  if (conFirma) {
    // FIRMA DEL GERENTE (IZQUIERDA)
    const firmaGerenteX = width * 0.20;
    
    const firmaFileName = empresaSeleccionada === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, "../../public", firmaFileName);
    
    if (fs.existsSync(firmaPath)) {
      const firmaImg = await loadImage(firmaPath);
      const firmaWidth = 350;
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaGerenteX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaGerenteX - 350, firmaY);
    ctx.lineTo(firmaGerenteX + 350, firmaY);
    ctx.stroke();

    ctx.font = "bold 40px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillText(empresaData.gerente, firmaGerenteX, firmaY + 60);
    ctx.font = "36px 'Helvetica'";
    ctx.fillText(`Cédula: ${empresaData.cedulaGerente}`, firmaGerenteX, firmaY + 105);
    ctx.fillText("Representante Legal", firmaGerenteX, firmaY + 150);
    ctx.fillText(empresaData.nombre, firmaGerenteX, firmaY + 195);

    // FIRMA DEL EMPLEADO (DERECHA)
    const firmaEmpleadoX = width * 0.80;
    ctx.font = "38px 'Helvetica'";
    ctx.fillText("FIRMA: _____________________________", firmaEmpleadoX, firmaY);
    ctx.fillText("CÉDULA: ____________________________", firmaEmpleadoX, firmaY + 100);
    
  } else {
    // SOLO FIRMA DEL GERENTE (CENTRADA)
    const firmaX = width / 2;
    
    const firmaFileName = empresaSeleccionada === 'ME' ? 'F- (3).png' : 'F- (2).png';
    const firmaPath = path.join(__dirname, "../../public", firmaFileName);
    
    if (fs.existsSync(firmaPath)) {
      const firmaImg = await loadImage(firmaPath);
      const firmaWidth = 350;
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
      await drawImageTransparent(ctx, firmaPath, firmaX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firmaX - 300, firmaY);
    ctx.lineTo(firmaX + 300, firmaY);
    ctx.stroke();

    ctx.font = "bold 40px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillText(empresaData.gerente, firmaX, firmaY + 60);
    ctx.font = "36px 'Helvetica'";
    ctx.fillText("Gerente General", firmaX, firmaY + 105);
    ctx.fillText(empresaData.nit || `CC: ${empresaData.cedulaGerente}`, firmaX, firmaY + 150);
  }

  // ========================================
  // PIE DE PÁGINA (barra coloreada con iconos)
  // ========================================
  await drawFooterBar(ctx, width, height, empresaData, empresaSeleccionada);

  return canvas;
};

export const generarCertificadoTerminacion = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;
  const { empresa } = req.query;
  
  try {
    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    const empresaSeleccionada = (empresa as string) || usuario.empresa || "AP";
    const empresaData = empresasData[empresaSeleccionada];
    
    const nombreCompleto = (req.query.nombreCompleto as string) || `${usuario.name} ${usuario.lastName}`;
    const cedula = (req.query.cedula as string) || usuario.documentoIdentificacion;
    const cargo = (req.query.cargo as string) || usuario.cargo || 'Sin cargo';
    const salario = parseFloat(req.query.salario as string) || usuario.salario || 0;
    
    const fechaIngresoRaw = usuario.fechaIngreso ? new Date(usuario.fechaIngreso) : new Date(usuario.createdAt);
    const fechaIngreso = formatDateSimple(fechaIngresoRaw);
    
    const fechaSalidaQuery = req.query.fechaSalida as string || '';
    const fechaSalida = fechaSalidaQuery ? formatDateSimple(new Date(fechaSalidaQuery + 'T12:00:00')) : '';
    
    const tipoTerminacion = req.query.tipoTerminacion as string || 'terminacion-unilateral-voluntaria';
    
    const tipoContrato = (req.query.tipoContrato as string) || usuario.tipoContrato || 'termino-indefinido';
    const textoContrato = tipoContrato === 'termino-fijo' ? 'a término fijo' : 'a término indefinido';
    
    const salarioFormateado = formatCurrency(salario);
    const salarioEnPalabras = numberToWords(Math.floor(salario));

    // Determinar texto de terminación
    let textoTerminacion = '';
    switch(tipoTerminacion) {
      case 'terminacion-unilateral-voluntaria':
        textoTerminacion = `laboró en nuestra empresa como ${cargo} desde el ${fechaIngreso} hasta el ${fechaSalida}, con un contrato ${textoContrato}, terminando la relación laboral unilateralmente de forma voluntaria, devengando un salario mensual de ${salarioFormateado} (${salarioEnPalabras} pesos).`;
        break;
      case 'terminacion-injusta-causa':
        textoTerminacion = `laboró en nuestra empresa como ${cargo} desde el ${fechaIngreso} hasta el ${fechaSalida}, con un contrato ${textoContrato}, devengando un salario bruto mensual de ${salarioFormateado} (${salarioEnPalabras} pesos), terminando la relación laboral por despido sin justa causa.`;
        break;
      case 'terminacion-justa-causa':
        textoTerminacion = `laboró en nuestra empresa como ${cargo} desde el ${fechaIngreso} hasta el ${fechaSalida}, con un contrato ${textoContrato}, devengando un salario bruto mensual de ${salarioFormateado} (${salarioEnPalabras} pesos), terminando la relación laboral por justa causa.`;
        break;
      case 'terminacion-contrato':
        textoTerminacion = `laboró en nuestra empresa como ${cargo} desde el ${fechaIngreso} hasta el ${fechaSalida}, con un contrato ${textoContrato}, devengando un salario bruto mensual de ${salarioFormateado} (${salarioEnPalabras} pesos), terminando la relación laboral por terminación de contrato.`;
        break;
    }

    const params = {
      nombreCompleto,
      cedula,
      cargo,
      fechaIngreso,
      fechaSalida,
      textoTerminacion,
    };

    // Generar ambas versiones del certificado
    // Primero: versión SIN firma (digital)
    const canvasSinFirma = await generarCanvasTerminacion(usuario, empresaData, empresaSeleccionada, params, false);
    // Segundo: versión CON firma (para firmar manualmente)
    const canvasConFirma = await generarCanvasTerminacion(usuario, empresaData, empresaSeleccionada, params, true);

    // Incrementar contador de certificados generados (solo una vez)
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    console.log(`✅ Contador incrementado para ${usuario.name} ${usuario.lastName}: ${usuario.certificadosGenerados}`);

    // Enviar ambas versiones en un solo PDF (primero sin firma, luego con firma)
    await sendMultipleCanvasAsPdf(res, [canvasSinFirma, canvasConFirma], `terminacion_${Uid}`);

  } catch (error: any) {
    console.error("Error generando certificado de terminación:", error);
    res.status(500).json({
      error: "Error al generar el certificado de terminación",
      message: error.message || error,
    });
  }
};

// Generar Desprendible de Pago
export const generarDesprendiblePago = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { 
      Uid, 
      numeroDias = 30, 
      extras = 0, 
      otrasDeducciones = 0, 
      prestamos = 0,
      fechaPago 
    } = req.body;

    if (!Uid) {
      return res.status(400).json({ error: "Uid es requerido" });
    }

    if (!fechaPago) {
      return res.status(400).json({ error: "Fecha de pago es requerida" });
    }

    const usuario = await User.findByPk(parseId(Uid));
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Obtener configuración de nómina vigente desde la base de datos
    const nominaConfig = await NominaConfig.findOne({
      where: { vigente: true },
      order: [['anio', 'DESC']]
    });

    if (!nominaConfig) {
      return res.status(500).json({ 
        error: "No se encontró configuración de nómina vigente. Contacte al administrador." 
      });
    }

    const area = await Area.findByPk(parseId(usuario.Aid));
    const nombreCompleto = `${usuario.name} ${usuario.lastName}`.toUpperCase();
    const salarioMensual = usuario.salario || 0;
    
    // Determinar si aplica auxilio de transporte (si gana menos de 2 salarios mínimos)
    const SALARIO_MINIMO = Number(nominaConfig.salarioMinimo);
    const AUXILIO_TRANSPORTE = Number(nominaConfig.auxilioTransporte);
    const aplicaAuxilioTransporte = salarioMensual < (SALARIO_MINIMO * 2);
    
    // Calcular devengados
    const salarioDias = (salarioMensual / 30) * numeroDias;
    const auxilioTransporteMonto = aplicaAuxilioTransporte ? AUXILIO_TRANSPORTE : 0;
    const extrasTotal = extras;
    const totalDevengado = salarioDias + auxilioTransporteMonto + extrasTotal;
    
    // Calcular deducciones (porcentajes desde la BD)
    const salud = Math.round(salarioMensual * Number(nominaConfig.porcentajeSalud));
    const pension = Math.round(salarioMensual * Number(nominaConfig.porcentajePension));
    const otrasDeduc = otrasDeducciones;
    const prestamosTotal = prestamos;
    const totalDeducciones = salud + pension + otrasDeduc + prestamosTotal;
    
    // Total a pagar
    const totalPagar = totalDevengado - totalDeducciones;

    // Configuración de canvas (mismo tamaño que otros certificados)
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Márgenes
    const margin = 150;
    const contentWidth = width - margin * 2;

    // Determinar empresa (usando datos globales)
    const empresaDesprendible = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaDesprendible] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const logoBottomNom = await drawLetterhead(ctx, width, height, empresaData, empresaDesprendible);
    await drawFooterBar(ctx, width, height, empresaData, empresaDesprendible);

    // Encabezado - Empresa
    ctx.fillStyle = "#000000";
    ctx.font = "bold 48px Helvetica";
    ctx.textAlign = "center";
    const headerY = logoBottomNom + 80;
    ctx.fillText(empresaData.nombre, width / 2, headerY);
    
    ctx.font = "42px Helvetica";
    if (empresaData.nit) ctx.fillText(empresaData.nit, width / 2, headerY + 60);
    
    ctx.font = "bold 46px Helvetica";
    ctx.fillText("LIQUIDACION DE NOMINA", width / 2, headerY + 140);
    
    // Fecha de pago
    ctx.font = "42px Helvetica";
    ctx.fillText(fechaPago, width / 2, headerY + 200);

    // Sección de información del empleado (tabla gris)
    const tableStartY = headerY + 280;
    const rowHeight = 80;
    
    // Función helper para dibujar filas de tabla
    const drawTableRow = (label: string, value: string, y: number, isHeader = false) => {
      // Fondo gris para etiquetas
      ctx.fillStyle = isHeader ? "#D3D3D3" : "#E8E8E8";
      ctx.fillRect(margin, y, contentWidth * 0.35, rowHeight);
      
      // Fondo blanco para valores
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(margin + contentWidth * 0.35, y, contentWidth * 0.65, rowHeight);
      
      // Bordes
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(margin, y, contentWidth, rowHeight);
      ctx.strokeRect(margin + contentWidth * 0.35, y, contentWidth * 0.65, rowHeight);
      
      // Texto
      ctx.fillStyle = "#000000";
      ctx.font = isHeader ? "bold 40px Helvetica" : "38px Helvetica";
      ctx.textAlign = "left";
      ctx.fillText(label, margin + 30, y + 50);
      
      ctx.font = "bold 40px Helvetica";
      ctx.fillText(value, margin + contentWidth * 0.35 + 30, y + 50);
    };
    
    drawTableRow("NOMBRE COMPLETO:", nombreCompleto, tableStartY);
    drawTableRow("CEDULA:", usuario.documentoIdentificacion, tableStartY + rowHeight);
    drawTableRow("SALARIO", formatCurrency(salarioMensual), tableStartY + rowHeight * 2);
    
    if (aplicaAuxilioTransporte) {
      drawTableRow("AUXILIO DE TRANSPORTE", formatCurrency(auxilioTransporteMonto), tableStartY + rowHeight * 3);
      drawTableRow("NUMERO DE DIAS:", numeroDias.toString(), tableStartY + rowHeight * 4);
    } else {
      drawTableRow("NUMERO DE DIAS:", numeroDias.toString(), tableStartY + rowHeight * 3);
    }

    // Calcular siguiente posición Y después de la tabla de empleado
    const nextSectionY = aplicaAuxilioTransporte ? tableStartY + rowHeight * 5 + 80 : tableStartY + rowHeight * 4 + 80;

    // Tabla de DEVENGADO y DEDUCCIONES (lado a lado)
    const tableWidth = (contentWidth - 40) / 2;
    const devenTableX = margin;
    const deducTableX = margin + tableWidth + 40;
    
    // Headers de las tablas
    ctx.fillStyle = "#000000";
    ctx.fillRect(devenTableX, nextSectionY, tableWidth, 60);
    ctx.fillRect(deducTableX, nextSectionY, tableWidth, 60);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px Helvetica";
    ctx.textAlign = "center";
    ctx.fillText("DEVENGADO", devenTableX + tableWidth / 2, nextSectionY + 45);
    ctx.fillText("DEDUCCIONES", deducTableX + tableWidth / 2, nextSectionY + 45);
    
    // Función para dibujar fila de tabla de conceptos
    const drawConceptRow = (label: string, amount: string, x: number, y: number) => {
      // Fondo gris para label
      ctx.fillStyle = "#E8E8E8";
      ctx.fillRect(x, y, tableWidth * 0.6, 70);
      
      // Fondo blanco para monto
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x + tableWidth * 0.6, y, tableWidth * 0.4, 70);
      
      // Bordes
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tableWidth, 70);
      ctx.strokeRect(x + tableWidth * 0.6, y, tableWidth * 0.4, 70);
      
      // Texto
      ctx.fillStyle = "#000000";
      ctx.font = "38px Helvetica";
      ctx.textAlign = "left";
      ctx.fillText(label, x + 20, y + 45);
      
      ctx.textAlign = "right";
      ctx.fillText(amount, x + tableWidth - 20, y + 45);
    };
    
    // DEVENGADO
    let currentY = nextSectionY + 60;
    drawConceptRow("SALARIO", formatCurrency(salarioDias), devenTableX, currentY);
    currentY += 70;
    
    if (aplicaAuxilioTransporte) {
      drawConceptRow("AUXILIO DE TRANSPORTE", formatCurrency(auxilioTransporteMonto), devenTableX, currentY);
      currentY += 70;
    }
    
    drawConceptRow("EXTRAS", formatCurrency(extrasTotal), devenTableX, currentY);
    currentY += 70;
    
    // Total devengado
    ctx.fillStyle = "#000000";
    ctx.fillRect(devenTableX, currentY, tableWidth, 70);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px Helvetica";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL DEVENGADO", devenTableX + 20, currentY + 45);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(totalDevengado), devenTableX + tableWidth - 20, currentY + 45);
    
    // DEDUCCIONES
    currentY = nextSectionY + 60;
    drawConceptRow("SALUD", formatCurrency(salud), deducTableX, currentY);
    currentY += 70;
    drawConceptRow("PENSION", formatCurrency(pension), deducTableX, currentY);
    currentY += 70;
    drawConceptRow("OTRAS DEDUCCIONES", formatCurrency(otrasDeduc), deducTableX, currentY);
    currentY += 70;
    drawConceptRow("PRESTAMOS", formatCurrency(prestamosTotal), deducTableX, currentY);
    currentY += 70;
    
    // Total deducciones
    ctx.fillStyle = "#000000";
    ctx.fillRect(deducTableX, currentY, tableWidth, 70);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px Helvetica";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL DEDUCIDO", deducTableX + 20, currentY + 45);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(totalDeducciones), deducTableX + tableWidth - 20, currentY + 45);
    
    // TOTAL A PAGAR (centrado, abajo de las dos tablas)
    const totalY = currentY + 100;
    ctx.fillStyle = "#000000";
    ctx.fillRect(margin, totalY, contentWidth, 80);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 46px Helvetica";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL A PAGAR", margin + 30, totalY + 52);
    
    ctx.font = "bold 48px Helvetica";
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(totalPagar), margin + contentWidth - 30, totalY + 52);

    // Enviar como PDF usando helper
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    await sendCanvasAsPdf(res, canvas, `desprendible_${Uid}_${fechaPago.replace(/\//g, '-')}`);

  } catch (error: any) {
    console.error("Error generando desprendible de pago:", error);
    res.status(500).json({
      error: "Error al generar el desprendible de pago",
      message: error.message || error,
    });
  }
};

// ============================================================
// GENERAR CERTIFICADO DE VACACIONES
// ============================================================
export const generarCertificadoVacaciones = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      Uid,
      fechaInicio,
      fechaFin,
      diasSolicitados,
      tipoVacaciones, // 'solo-vacaciones' o 'vacaciones-pagos' o 'solo-pagos'
      solicitaCabana, // Nuevo campo
    } = req.body;

    if (!Uid) {
      return res.status(400).json({ error: "Uid es requerido" });
    }

    if (!fechaInicio || !fechaFin || !diasSolicitados) {
      return res.status(400).json({ 
        error: "Fecha de inicio, fecha de fin y días solicitados son requeridos" 
      });
    }

    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Convertir fechas de string a Date
    const [diaInicio, mesInicio, anioInicio] = fechaInicio.split('/').map(Number);
    const [diaFin, mesFin, anioFin] = fechaFin.split('/').map(Number);
    const fechaInicioDate = new Date(anioInicio, mesInicio - 1, diaInicio);
    const fechaFinDate = new Date(anioFin, mesFin - 1, diaFin);

    // Calcular días laborales reales
    const diasLaboralesCalculados = calcularDiasLaborales(fechaInicioDate, fechaFinDate);
    
    console.log(`📅 Cálculo de días laborales:`);
    console.log(`   Desde: ${fechaInicio} hasta ${fechaFin}`);
    console.log(`   Días solicitados (manual): ${diasSolicitados}`);
    console.log(`   Días laborales calculados: ${diasLaboralesCalculados}`);
    
    // Usar los días laborales calculados en lugar de los solicitados manualmente
    const diasReales = diasLaboralesCalculados;

    const area: any = usuario.area;
    const nombreCompleto = `${usuario.name} ${usuario.lastName}`.toUpperCase();
    const esGestionAdministrativa = area?.Aname?.toLowerCase().includes('gestión administrativa') || 
                                     area?.Aname?.toLowerCase().includes('gestion administrativa');

    // Validar días según área (usando días laborales reales)
    if (!esGestionAdministrativa) {
      if (tipoVacaciones === 'solo-vacaciones' && diasReales < 6) {
        return res.status(400).json({ 
          error: `Mínimo 6 días laborales de vacaciones para áreas diferentes a Gestión Administrativa. Días laborales calculados: ${diasReales}` 
        });
      }
    } else {
      // Para Gestión Administrativa, mínimo 3 días
      if (diasReales < 3) {
        return res.status(400).json({ 
          error: `Mínimo 3 días laborales de vacaciones para Gestión Administrativa. Días laborales calculados: ${diasReales}` 
        });
      }
    }

    // Validar máximo de días para solo-pagos
    if (tipoVacaciones === 'solo-pagos' && diasReales > 9) {
      return res.status(400).json({
        error: `Máximo 9 días laborales para días pagos. Días laborales calculados: ${diasReales}`
      });
    }

    // Configuración de canvas
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Márgenes más amplios
    const margin = 200;
    const contentWidth = width - margin * 2;

    // Determinar empresa (usando datos globales)
    const empresaVacaciones = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaVacaciones] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const logoBottomVac = await drawLetterhead(ctx, width, height, empresaData, empresaVacaciones);
    await drawFooterBar(ctx, width, height, empresaData, empresaVacaciones);

    // ========================================
    // TÍTULO - CENTRADO DEBAJO DEL LOGO
    // ========================================
    ctx.fillStyle = "#000000";
    ctx.font = "bold 70px Helvetica";
    ctx.textAlign = "center";
    const tituloY = logoBottomVac + 120; // Posición del título, debajo del logo
    const tituloPDF = tipoVacaciones === 'solo-pagos'
      ? "Solicitud de días pagos de vacaciones"
      : "Solicitud de Vacaciones";
    ctx.fillText(tituloPDF, width / 2, tituloY);

    // ========================================
    // ENCABEZADO - JUSTIFICADO A LA IZQUIERDA (Formato Carta)
    // ========================================

    const encabezadoX = margin; // Alineado a la izquierda
    let encabezadoY = tituloY + 200; // Más espacio después del título
    
    ctx.font = "44px Helvetica";
    ctx.textAlign = "left"; // Cambiado a izquierda
    ctx.fillStyle = "#000000";
    
    ctx.fillText(`Dirigido a: ${empresaData.nombre}`, encabezadoX, encabezadoY);
    encabezadoY += 80; // Más espacio entre líneas
    
    ctx.fillText(`Asunto: ${tituloPDF}`, encabezadoX, encabezadoY);
    encabezadoY += 80;
    
    const hoy = new Date();
    const fechaActual = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;
    ctx.fillText(`Fecha de expedición: ${fechaActual}`, encabezadoX, encabezadoY);

    // ========================================
    // CONTENIDO DE LA CARTA - JUSTIFICADO A LA IZQUIERDA
    // ========================================
    const contentY = encabezadoY + 200; // Más espacio después del encabezado
    ctx.font = "46px Helvetica";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";

    const lineHeight = 85; // Más espacio entre líneas
    let currentY = contentY;

    // Texto principal de la carta
    const cargo = usuario.cargo || area?.Aname || 'Colaborador';
    const texto = `Mediante la presente carta, yo ${nombreCompleto}, identificado(a) con No. ${usuario.documentoIdentificacion}, quien me desempeño como ${cargo}, solicito formalmente la intención de tomar mis días de vacaciones correspondientes a:`;
    
    // Dividir el texto en líneas (wrap text manual)
    const palabras = texto.split(' ');
    let linea = '';
    const maxWidth = contentWidth;
    
    for (let palabra of palabras) {
      const testLinea = linea + palabra + ' ';
      const metrics = ctx.measureText(testLinea);
      
      if (metrics.width > maxWidth && linea !== '') {
        ctx.fillText(linea.trim(), margin, currentY);
        currentY += lineHeight;
        linea = palabra + ' ';
      } else {
        linea = testLinea;
      }
    }
    if (linea.trim() !== '') {
      ctx.fillText(linea.trim(), margin, currentY);
      currentY += lineHeight;
    }

    currentY += 100; // Más espacio antes del período

    // ========================================
    // PERÍODO DE VACACIONES - DESTACADO
    // ========================================
    ctx.font = "bold 48px Helvetica";
    ctx.fillStyle = "#1a5490";
    ctx.fillText(`Período de vacaciones:`, margin, currentY);
    currentY += lineHeight;
    
    ctx.font = "46px Helvetica";
    ctx.fillStyle = "#000000";
    ctx.fillText(`    Desde:  ${fechaInicio}`, margin, currentY);
    currentY += lineHeight;
    
    ctx.fillText(`    Hasta:   ${fechaFin}`, margin, currentY);
    currentY += lineHeight;
    
    // Información de días laborales
    ctx.font = "42px Helvetica";
    ctx.fillStyle = "#666666";
    ctx.fillText(`    ${diasReales} días laborales (excluyendo fines de semana y festivos)`,
                 margin + 20, currentY);
    ctx.fillStyle = "#000000";
    currentY += lineHeight * 1.5; // Más espacio después

    // Distribución según tipo
    if (tipoVacaciones === 'vacaciones-pagos') {
      const diasVacaciones = Math.min(diasReales, 15);
      const diasPagos = Math.max(0, diasReales - 15);
      
      ctx.font = "44px Helvetica";
      ctx.fillText(`    • Días de vacaciones: ${diasVacaciones}`, margin + 20, currentY);
      currentY += lineHeight;
      
      if (diasPagos > 0) {
        ctx.fillText(`    • Días pagos adicionales: ${diasPagos}`, margin + 20, currentY);
        currentY += lineHeight;
      }
      currentY += 80; // Más espacio después
    } else if (tipoVacaciones === 'solo-pagos') {
      ctx.font = "44px Helvetica";
      ctx.fillText(`    • Días pagos: ${diasReales}`, margin + 20, currentY);
      currentY += lineHeight;
      currentY += 80;
    }

    // ========================================
    // SOLICITUD DE CABAÑA - BIEN ESPACIADO CON CAJA MÁS ALTA
   

    // ========================================
    // FIRMAS - BIEN UBICADAS AL FINAL CON MÁS ESPACIO
    // ========================================
    const firmaY = height - 550; // Más arriba para tener más espacio
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    
    // Línea de firma - más ancha y centrada
    const firmaWidth = 700;
    const firmaX = (width - firmaWidth) / 2;
    ctx.beginPath();
    ctx.moveTo(firmaX, firmaY);
    ctx.lineTo(firmaX + firmaWidth, firmaY);
    ctx.stroke();
    
    // Texto de firma - centrado y espaciado
    ctx.font = "bold 44px Helvetica";
    ctx.textAlign = "center";
    ctx.fillText("Firma del trabajador", width / 2, firmaY + 70);
    
    ctx.font = "42px Helvetica";
    
    ctx.font = "36px Helvetica";
    ctx.fillStyle = "#666666";

    // Enviar como PDF usando helper
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    await sendCanvasAsPdf(res, canvas, `vacaciones_${Uid}_${fechaInicio.replace(/\//g, '-')}`);

  } catch (error: any) {
    console.error("Error generando certificado de vacaciones:", error);
    res.status(500).json({
      error: "Error al generar el certificado de vacaciones",
      message: error.message || error,
    });
  }
};

// ============================================================
// GENERAR NOTIFICACIÓN DE VACACIONES (SOLO ADMIN)
// ============================================================
export const generarNotificacionVacaciones = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      Uid,
      fechaInicio,
      fechaFin,
      diasSolicitados,
      ciudad,
      fechaNotificacion,
      periodoVacaciones, // Nuevo campo para el período (ej: "2024-2025")
      solicitaCabana // Nuevo campo para solicitud de cabaña
    } = req.body;

    if (!Uid || !fechaInicio || !fechaFin || !diasSolicitados) {
      return res.status(400).json({ 
        error: "Uid, fechas y días son requeridos" 
      });
    }

    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const nombreCompleto = `${usuario.name} ${usuario.lastName}`.toUpperCase();
    const area: any = usuario.area;
    const cargo = usuario.cargo || area?.Aname || 'N/A';

    // Configuración de canvas (tamaño carta)
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const margin = 200;
    const contentWidth = width - margin * 2;

    // Determinar empresa (usando datos globales)
    const empresaNotif = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaNotif] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const logoBottomNotif = await drawLetterhead(ctx, width, height, empresaData, empresaNotif);
    await drawFooterBar(ctx, width, height, empresaData, empresaNotif);

    // ========================================
    // CIUDAD Y FECHA (debajo del logo)
    // ========================================
    ctx.fillStyle = "#000000";
    ctx.font = "44px Arial";
    ctx.textAlign = "right";
    
    const ciudadTexto = ciudad || "Pereira";
    const fechaNot = fechaNotificacion || new Date().toLocaleDateString('es-CO');
    ctx.fillText(`${ciudadTexto}, ${fechaNot}`, width - margin, logoBottomNotif + 80);
    
    // Posición Y - Debajo del logo
    let yPos = logoBottomNotif + 180;

    // ========================================
    // TÍTULO
    // ========================================
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NOTIFICACIÓN DE VACACIONES", width / 2, yPos);
    
    yPos += 280; // Mucho más espacio después del título

    // ========================================
    // INFORMACIÓN DEL EMPLEADO
    // ========================================
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "left";
    ctx.fillText(nombreCompleto, margin, yPos);
    yPos += 85;
    
    ctx.font = "48px Arial";
    ctx.fillText(`CÉDULA ${usuario.documentoIdentificacion}`, margin, yPos);
    yPos += 85;
    
    ctx.fillText(cargo, margin, yPos);
    yPos += 180;

    // ========================================
    // SALUDO
    // ========================================
    ctx.fillText("Cordial Saludo;", margin, yPos);
    yPos += 180;

    // ========================================
    // CUERPO DEL TEXTO
    // ========================================
    const lineHeight = 70;
    
    // Calcular días calendario
    const [diaIni, mesIni, anioIni] = fechaInicio.split('/').map(Number);
    const [diaFin, mesFin, anioFin] = fechaFin.split('/').map(Number);
    const fechaIniDate = new Date(anioIni, mesIni - 1, diaIni);
    const fechaFinDate = new Date(anioFin, mesFin - 1, diaFin);
    
    // Convertir fechas a texto
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    
    const diaInicioTexto = dias[fechaIniDate.getDay()];
    const mesInicioTexto = meses[fechaIniDate.getMonth()];
    const diaFinTexto = dias[fechaFinDate.getDay()];
    const mesFinTexto = meses[fechaFinDate.getMonth()];
    
    // Calcular fecha de retorno (siguiente día hábil)
    const fechaRetorno = new Date(fechaFinDate);
    fechaRetorno.setDate(fechaRetorno.getDate() + 1);
    
    // Si cae en sábado, mover a lunes
    if (fechaRetorno.getDay() === 6) {
      fechaRetorno.setDate(fechaRetorno.getDate() + 2);
    }
    // Si cae en domingo, mover a lunes
    if (fechaRetorno.getDay() === 0) {
      fechaRetorno.setDate(fechaRetorno.getDate() + 1);
    }
    
    const diaRetornoTexto = dias[fechaRetorno.getDay()];
    const mesRetornoTexto = meses[fechaRetorno.getMonth()];
    const diaRetorno = fechaRetorno.getDate();
    const anioRetorno = fechaRetorno.getFullYear();
    
    // Usar período proporcionado o calcular automáticamente
    const periodo = periodoVacaciones || `${anioIni}-${anioIni + 1}`;
    
    ctx.font = "48px Arial";
    const textoCuerpo = `Por medio de la presente me permito notificarle que usted podrá disfrutar de ${diasSolicitados} días hábiles de vacaciones que van desde el día ${diaInicioTexto} ${diaIni} de ${mesInicioTexto} hasta el día ${diaFinTexto} ${diaFin} de ${mesFinTexto} del ${anioFin} correspondientes al período ${periodo}, retornando a sus actividades laborales el día ${diaRetornoTexto} ${diaRetorno} de ${mesRetornoTexto} de ${anioRetorno}.`;
    
    const palabras = textoCuerpo.split(' ');
    let linea = '';
    
    for (let palabra of palabras) {
      const testLinea = linea + palabra + ' ';
      const metrics = ctx.measureText(testLinea);
      
      if (metrics.width > contentWidth && linea !== '') {
        ctx.fillText(linea.trim(), margin, yPos);
        yPos += lineHeight;
        linea = palabra + ' ';
      } else {
        linea = testLinea;
      }
    }
    if (linea.trim() !== '') {
      ctx.fillText(linea.trim(), margin, yPos);
      yPos += lineHeight;
    }

    yPos += 120;

    // ========================================
    // NOTA ESPECIAL SI SOLICITA CABAÑA
    // ========================================
    if (solicitaCabana) {
      yPos += 60; // Espacio adicional antes de la nota
      
      // Texto de la nota especial
      const notaCabana = 'Teniendo en cuenta que en su solicitud de vacaciones, manifestó que aplicará al beneficio de uso de cabaña y al bono de alimentación que la empresa otorga para este periodo, se procederá con la gestión correspondiente para la asignación de la cabaña y la entrega del bono de alimentación, conforme a las políticas internas vigentes.';
      
      // Recuadro con fondo amarillo claro
      const paddingBox = 40;
      const boxStartY = yPos - paddingBox;
      
      // Calcular altura del recuadro basado en líneas de texto
      const palabrasNota = notaCabana.split(' ');
      let lineaNota = '';
      let numLineas = 0;
      
      for (let palabra of palabrasNota) {
        const testLinea = lineaNota + palabra + ' ';
        const metrics = ctx.measureText(testLinea);
        
        if (metrics.width > (contentWidth - paddingBox * 2) && lineaNota !== '') {
          numLineas++;
          lineaNota = palabra + ' ';
        } else {
          lineaNota = testLinea;
        }
      }
      if (lineaNota.trim() !== '') {
        numLineas++;
      }
      
      const boxHeight = (numLineas * lineHeight) + (paddingBox * 2);
      
      // Dibujar recuadro
      ctx.fillStyle = "#FFF9E6";
      ctx.fillRect(margin - 30, boxStartY, contentWidth + 60, boxHeight);
      
      // Borde del recuadro
      ctx.strokeStyle = "#FFD600";
      ctx.lineWidth = 5;
      ctx.strokeRect(margin - 30, boxStartY, contentWidth + 60, boxHeight);
      
      // Título de la nota
      ctx.font = "bold 50px Arial";
      ctx.fillStyle = "#B8860B";
      ctx.textAlign = "left";
      ctx.fillText("📋 NOTA IMPORTANTE:", margin, yPos);
      yPos += lineHeight + 20;
      
      // Texto de la nota
      ctx.font = "46px Arial";
      ctx.fillStyle = "#000000";
      
      lineaNota = '';
      for (let palabra of palabrasNota) {
        const testLinea = lineaNota + palabra + ' ';
        const metrics = ctx.measureText(testLinea);
        
        if (metrics.width > (contentWidth - paddingBox * 2) && lineaNota !== '') {
          ctx.fillText(lineaNota.trim(), margin, yPos);
          yPos += lineHeight;
          lineaNota = palabra + ' ';
        } else {
          lineaNota = testLinea;
        }
      }
      if (lineaNota.trim() !== '') {
        ctx.fillText(lineaNota.trim(), margin, yPos);
        yPos += lineHeight;
      }
      
      yPos += paddingBox; // Espacio después del recuadro
    }

    // ========================================
    // AGRADECIMIENTO
    // ========================================
    ctx.font = "48px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.fillText("Agradezco su compromiso con la empresa y le deseo felices vacaciones.", margin, yPos);
    
    // ========================================
    // FIRMAS - Calcular posición para usar todo el espacio
    // ========================================
    const firmaY = height - 650; // Posicionar firmas más abajo para usar espacio
    const firmaIzqX = width * 0.25;
    const firmaDerX = width * 0.75;
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;

    // ========================================
    // FIRMA IZQUIERDA - Representante Legal CON FIRMA IMAGEN
    // ========================================
    const firmaRepresentantePath = path.join(__dirname, "../../public/F- (2).png");
    if (fs.existsSync(firmaRepresentantePath)) {
      try {
        const firmaImg = await loadImage(firmaRepresentantePath);
        const firmaWidth = 500;
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
        await drawImageTransparent(ctx, firmaRepresentantePath, firmaIzqX - firmaWidth/2, firmaY - firmaHeight + 30, firmaWidth, firmaHeight);
      } catch (err) {
        console.warn("Error al cargar firma representante:", err);
      }
    } else {
      console.warn("Archivo de firma no encontrado:", firmaRepresentantePath);
    }

    // Línea firma izquierda
    ctx.beginPath();
    ctx.moveTo(firmaIzqX - 300, firmaY + 60);
    ctx.lineTo(firmaIzqX + 300, firmaY + 60);
    ctx.stroke();

    ctx.font = "bold 46px Arial";
    ctx.textAlign = "center";
    
    // Nombre del representante según empresa
    let nombreRepresentante = "Carlos Andrés Tobón Agudelo";
    if (usuario.empresa === "ME") {
      nombreRepresentante = "Maria Evangelina Agudelo Gil";
    } else if (usuario.empresa === "AP") {
      nombreRepresentante = "Carlos Andrés Tobón Agudelo";
    }
    
    ctx.fillText(nombreRepresentante, firmaIzqX, firmaY + 130);
    ctx.font = "44px Arial";
    ctx.fillText("Representante legal", firmaIzqX, firmaY + 190);

    // ========================================
    // FIRMA DERECHA - Empleado (solo línea y espacio para nombre/cédula)
    // ========================================
    ctx.beginPath();
    ctx.moveTo(firmaDerX - 300, firmaY + 60);
    ctx.lineTo(firmaDerX + 300, firmaY + 60);
    ctx.stroke();

    ctx.font = "bold 46px Arial";
    ctx.fillText(nombreCompleto, firmaDerX, firmaY + 130);
    ctx.font = "44px Arial";
    ctx.fillText(`C.C. ${usuario.documentoIdentificacion}`, firmaDerX, firmaY + 190);

    // Enviar como PDF usando helper
    await sendCanvasAsPdf(res, canvas, `notificacion_vacaciones_${Uid}_${fechaInicio.replace(/\//g, '-')}`);

  } catch (error: any) {
    console.error("Error generando notificación de vacaciones:", error);
    res.status(500).json({
      error: "Error al generar la notificación de vacaciones",
      message: error.message || error,
    });
  }
};

// ============================================================
// GENERAR CERTIFICADO DÍA DE LA FAMILIA
// ============================================================
export const generarCertificadoDiaFamilia = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { Uid, fechaSolicitud, fechaDiaFamilia } = req.body;

    if (!Uid || !fechaSolicitud || !fechaDiaFamilia) {
      return res.status(400).json({ 
        error: "Uid, fecha de solicitud y fecha del día de la familia son requeridos" 
      });
    }

    const usuario: any = await User.findByPk(parseId(Uid), {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const nombreCompleto = `${usuario.name} ${usuario.lastName}`.toUpperCase();

    // Configuración de canvas (tamaño A4)
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const margin = 200;
    const contentWidth = width - margin * 2;

    // Determinar empresa (usando datos globales)
    const empresaDiaFamilia = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaDiaFamilia] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const logoBottomFam = await drawLetterhead(ctx, width, height, empresaData, empresaDiaFamilia);
    await drawFooterBar(ctx, width, height, empresaData, empresaDiaFamilia);

    // ========================================
    // TÍTULO
    // ========================================
    let yPos = logoBottomFam + 120;
    ctx.fillStyle = "#000000";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SOLICITUD PARA EL DÍA DE LA FAMILIA", width / 2, yPos);

    yPos += 180;

    // ========================================
    // FECHA DE SOLICITUD
    // ========================================
    // Parsear fechaSolicitud que viene en formato DD/MM/YYYY
    const partesFechaSol = fechaSolicitud.split('/');
    const diaSol = partesFechaSol[0];
    const mesSol = partesFechaSol[1];
    const anioSol = partesFechaSol[2];
    
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Fecha de la solicitud:", margin, yPos);
    
    yPos += 65;
    
    ctx.font = "44px Arial";
    ctx.fillText(`Día: ${diaSol}     Mes: ${mesSol}     Año: ${anioSol}`, margin + 100, yPos);
    
    yPos += 100;

    // ========================================
    // INFORMACIÓN DEL COLABORADOR
    // ========================================
    ctx.font = "44px Arial";
    ctx.fillText(`Nombre del colaborador: ${nombreCompleto}`, margin, yPos);
    yPos += 65;
    
    ctx.fillText(`Número de documento: ${usuario.documentoIdentificacion}`, margin, yPos);
    yPos += 120;

    // ========================================
    // TEXTO LEGAL - PRIMER PÁRRAFO
    // ========================================
    ctx.font = "44px Arial";
    ctx.textAlign = "left";
    
    const textoPrefijo = "Dando cumplimiento a lo dispuesto en el artículo 3 de la Ley 1857 de 2017 adiciona el artículo 5A a la Ley 1361 de 2009 con el siguiente parágrafo:";
    
    const palabrasPrefijo = textoPrefijo.split(' ');
    let linea = '';
    const lineHeight = 60;
    
    for (let palabra of palabrasPrefijo) {
      const testLinea = linea + palabra + ' ';
      const metrics = ctx.measureText(testLinea);
      
      if (metrics.width > contentWidth && linea !== '') {
        ctx.fillText(linea.trim(), margin, yPos);
        yPos += lineHeight;
        linea = palabra + ' ';
      } else {
        linea = testLinea;
      }
    }
    if (linea.trim() !== '') {
      ctx.fillText(linea.trim(), margin, yPos);
      yPos += lineHeight;
    }

    yPos += 80;

    // ========================================
    // TEXTO LEGAL - PÁRRAFO EN CURSIVA (con "«Parágrafo" en negrilla)
    // ========================================
    
    // Primero escribir "«Parágrafo" en negrilla cursiva
    ctx.font = "bold italic 44px Arial";
    const palabraParrafo = "«Parágrafo.";
    ctx.fillText(palabraParrafo, margin, yPos);
    
    // Medir el ancho de "«Parágrafo" para continuar desde ahí
    const anchoParrafo = ctx.measureText(palabraParrafo).width;
    
    // Continuar con el resto en cursiva normal
    ctx.font = "italic 44px Arial";
    
    const restoTexto = " Los empleadores deberán facilitar, promover y gestionar una jornada semestral en la que sus empleados puedan compartir con su familia en un espacio suministrado por el empleador o en uno gestionado ante la caja de compensación familiar con la que cuentan los empleados. Si el empleador no logra gestionar esta jornada deberá permitir que los trabajadores tengan este espacio de tiempo con sus familias sin afectar los días de descanso, esto sin perjuicio de acordar el horario laboral complementario»,";
    
    const palabrasResto = restoTexto.split(' ');
    linea = '';
    let xPos = margin + anchoParrafo + 10; // Empezar después de "«Parágrafo"
    let primeraLinea = true;
    
    for (let palabra of palabrasResto) {
      const testLinea = linea + palabra + ' ';
      const metrics = ctx.measureText(testLinea);
      const anchoDisponible = primeraLinea ? (contentWidth - anchoParrafo - 10) : contentWidth;
      
      if (metrics.width > anchoDisponible && linea !== '') {
        ctx.fillText(linea.trim(), xPos, yPos);
        yPos += lineHeight;
        linea = palabra + ' ';
        xPos = margin;
        primeraLinea = false;
      } else {
        linea = testLinea;
      }
    }
    if (linea.trim() !== '') {
      ctx.fillText(linea.trim(), xPos, yPos);
      yPos += lineHeight;
    }

    yPos += 100;

    // ========================================
    // NOTIFICACIÓN
    // ========================================
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Se notifica que se le concede un (1) día para compartir con la familia.", margin, yPos);
    yPos += 120;

    // ========================================
    // FECHA DEL DÍA DE LA FAMILIA
    // ========================================
    // Parsear fechaDiaFamilia que viene en formato DD/MM/YYYY
    const partesFechaFam = fechaDiaFamilia.split('/');
    const diaFam = partesFechaFam[0];
    const mesFam = partesFechaFam[1];
    const anioFam = partesFechaFam[2];
    
    ctx.font = "bold 44px Arial";
    ctx.fillText("Fecha para la cual se otorga el día de la familia:", margin, yPos);
    yPos += 65;
    
    ctx.font = "44px Arial";
    ctx.fillText(`Día: ${diaFam}     Mes: ${mesFam}     Año: ${anioFam}`, margin + 100, yPos);

    // ========================================
    // FIRMAS - COLABORADOR Y GESTIÓN HUMANA
    // ========================================
    const firmaY = height - 500;
    const firmaIzqX = width * 0.30;
    const firmaDerX = width * 0.70;
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;

    // Firma izquierda - Colaborador
    ctx.beginPath();
    ctx.moveTo(firmaIzqX - 300, firmaY);
    ctx.lineTo(firmaIzqX + 300, firmaY);
    ctx.stroke();

    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Firma del colaborador", firmaIzqX, firmaY + 70);

    // ========================================
    // CONVERTIR Y ENVIAR
    // ========================================
    // Enviar como PDF usando helper
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    await sendCanvasAsPdf(res, canvas, `dia_familia_${Uid}_${fechaDiaFamilia.replace(/\//g, '-')}`);

  } catch (error: any) {
    console.error("Error generando certificado día de la familia:", error);
    res.status(500).json({
      error: "Error al generar el certificado día de la familia",
      message: error.message || error,
    });
  }
};

