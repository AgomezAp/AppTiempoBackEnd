import { Request, Response } from "express";
import { User } from "../models/user";
import { Area } from "../models/area";
import { createCanvas, loadImage, registerFont } from "canvas";
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

// Datos de las empresas
const empresasData: any = {
  AP: {
    nombre: "ANDRES PUBLICIDAD TG SAS",
    nit: "NIT 901.458.142-2",
    gerente: "Carlos Andrés Tobón Agudelo",
    cedulaGerente: "1088254149",
    lider: "Yessica De La Rosa",
    cargoLider: "Líder de Gestión Humana",
    direccion: "Pereira, Risaralda - Colombia",
    telefono: "(+57) 324 234 1917",
    email: "andrespublicidad@andrespublicidadtg.com",
    logo: "Logo2.png",
    headerColor: "#000000",
    accentColor: "#1a5490",
  },
  AT: {
    nombre: "ANDRÉS TOBÓN",
    nit: "",
    gerente: "Carlos Andrés Tobón Agudelo",
    cedulaGerente: "1088254149",
    lider: "Yessica De La Rosa",
    cargoLider: "Líder de Gestión Humana",
    direccion: "Pereira, Risaralda - Colombia",
    telefono: "(+57) 324 234 1917",
    email: "andres.tobonag87@gmail.com",
    logo: "Logo1.png",
    headerColor: "#000000",
    accentColor: "#333333",
  },
  ME: {
    nombre: "MARIA EVANGELINA AGUDELO GIL",
    nit: "CC. 42094435",
    gerente: "María Evangelina Agudelo Gil",
    cedulaGerente: "42094435",
    lider: "Yessica De La Rosa",
    cargoLider: "Líder de Gestión Humana",
    direccion: "",
    telefono: "Contacto: 3242341917",
    email: "",
    logo: "Logo3.png",
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
    const usuario: any = await User.findByPk(Uid, {
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

    const certificado = {
      empresa: empresaData.nombre,
      nit: empresaData.nit,
      nombreCompleto: `${usuario.name} ${usuario.lastName}`,
      documentoIdentificacion: usuario.documentoIdentificacion || "N/A",
      cargo: usuario.area?.Aname || "Sin cargo asignado",
      fechaIngreso: formatDateSpanish(
        new Date(usuario.createdAt || Date.now())
      ),
      salario: salarioFormateado,
      salarioEnPalabras: salarioEnPalabras,
      fechaCertificado: formatDateSpanish(new Date()),
      gerente: empresaData.gerente,
      lider: empresaData.lider,
      cargoLider: empresaData.cargoLider,
      direccion: empresaData.direccion,
      telefono: empresaData.telefono,
      email: empresaData.email,
      logo: empresaData.logo,
      tipoContrato: "término indefinido",
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

// Función para verificar si es el primer sábado del mes
function esPrimerSabadoDelMes(fecha: Date): boolean {
  if (fecha.getDay() !== 6) return false; // No es sábado
  
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const diaPrimerDia = primerDia.getDay();
  
  // Calcular qué día será el primer sábado
  let diasHastaPrimerSabado = 6 - diaPrimerDia;
  if (diasHastaPrimerSabado < 0) diasHastaPrimerSabado += 7;
  
  const primerSabado = 1 + diasHastaPrimerSabado;
  
  return fecha.getDate() === primerSabado;
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
    const esPrimerSabado = esPrimerSabadoDelMes(currentDate);
    
    let esLaboral = false;
    let razon = '';
    
    // Verificar si es día laboral
    if (diaSemana === 0) {
      // Domingo - NO es laboral
      razon = '❌ Domingo';
    } else if (diaSemana === 6) {
      // Sábado - solo es laboral si es el primer sábado del mes Y no es festivo
      if (esPrimerSabado && !esFestivoHoy) {
        esLaboral = true;
        razon = '✅ Primer sábado del mes (LABORAL)';
        diasLaborales++;
      } else if (esPrimerSabado && esFestivoHoy) {
        razon = '❌ Primer sábado pero es festivo';
      } else {
        razon = '❌ Sábado no laboral';
      }
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

    const usuario: any = await User.findByPk(Uid, {
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
    const fechaIngreso = formatDateSpanish(
      new Date(usuario.createdAt || Date.now())
    );

    // Crear canvas (tamaño A4 en píxeles: 2480 x 3508 a 300 DPI)
    console.log("📄 Creando canvas...");
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    console.log("✅ Canvas creado");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // ========================================
    // LOGO EN LA PARTE SUPERIOR CENTRAL
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    console.log("🖼️ Buscando logo en:", logoPath);
    console.log("Logo existe?", fs.existsSync(logoPath));

    if (fs.existsSync(logoPath)) {
      try {
        console.log("📥 Cargando logo...");
        const logo = await loadImage(logoPath);
        console.log("✅ Logo cargado correctamente");

        // Tamaño del logo (más pequeño y ajustado)
        let logoWidth = 500;
        let logoY = 150;

        if (usuario.empresa === "AP" || usuario.empresa === "AT") {
          logoWidth = 500;
          logoY = 150;
        } else if (usuario.empresa === "ME") {
          logoWidth = 500;
          logoY = 250; // Bajar más para ME
        }

        const logoHeight = (logo.height / logo.width) * logoWidth;
        const logoX = (width - logoWidth) / 2;

        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        console.log("✅ Logo dibujado en canvas");
      } catch (logoError) {
        console.error("❌ Error al cargar/dibujar logo:", logoError);
      }
    } else {
      console.warn("⚠️ Logo no encontrado, continuando sin logo");
    }

    // ========================================
    // MARCA DE AGUA DEL LOGO (transparente, centrada en el fondo)
    // ========================================
    if (fs.existsSync(logoPath)) {
      try {
        console.log("💧 Agregando marca de agua...");
        ctx.save();
        ctx.globalAlpha = 0.05; // Muy transparente para marca de agua
        
        const logo = await loadImage(logoPath);
        const watermarkSize = 2000; // Logo gigante como marca de agua
        const watermarkHeight = (logo.height / logo.width) * watermarkSize;
        const watermarkX = (width - watermarkSize) / 2;
        const watermarkY = (height - watermarkHeight) / 2;

        ctx.drawImage(logo, watermarkX, watermarkY, watermarkSize, watermarkHeight);
        ctx.restore();
        console.log("✅ Marca de agua agregada");
      } catch (watermarkError) {
        console.error("❌ Error al agregar marca de agua:", watermarkError);
      }
    }

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
    const parrafo1 = `Por medio de la presente, hacemos constar que el (la) señor (a) ${usuario.name.toUpperCase()} ${usuario.lastName.toUpperCase()}, identificado (a) con CÉDULA DE CIUDADANÍA ${
      usuario.documentoIdentificacion
    }, labora en nuestra empresa como ${
      usuario.area?.Aname || "Sin cargo"
    } desde el ${fechaIngreso}, con un contrato a término indefinido y devengando un salario mensual de ${salarioFormateado} (${salarioEnPalabras} pesos).`;

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
      // FIRMA IZQUIERDA - MARÍA EVANGELINA
      const firmaMEPath = path.join(__dirname, "../../public/Firma3.jpeg");
      if (fs.existsSync(firmaMEPath)) {
        try {
          const firmaMEImg = await loadImage(firmaMEPath);
          const firmaWidth = 350;
          const firmaHeight = (firmaMEImg.height / firmaMEImg.width) * firmaWidth;
          ctx.drawImage(firmaMEImg, firmaIzqX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
        } catch (err) {
          console.warn("Error al cargar Firma3.jpeg:", err);
        }
      }

      ctx.beginPath();
      ctx.moveTo(firmaIzqX - 300, firmaY);
      ctx.lineTo(firmaIzqX + 300, firmaY);
      ctx.stroke();

      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.fillText(empresaData.gerente, firmaIzqX, firmaY + 55);
      ctx.font = "36px Arial";
      ctx.fillText("Gerente General", firmaIzqX, firmaY + 100);

      // FIRMA DERECHA - YESSICA DE LA ROSA
      if (empresaData.lider) {
        const firmaYessicaPath = path.join(__dirname, "../../public/Firma1.jpg");
        if (fs.existsSync(firmaYessicaPath)) {
          try {
            const firmaYessicaImg = await loadImage(firmaYessicaPath);
            const firmaWidth = 350;
            const firmaHeight = (firmaYessicaImg.height / firmaYessicaImg.width) * firmaWidth;
            ctx.drawImage(firmaYessicaImg, firmaDerX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
          } catch (err) {
            console.warn("Error al cargar Firma1.jpg:", err);
          }
        }

        ctx.beginPath();
        ctx.moveTo(firmaDerX - 300, firmaY);
        ctx.lineTo(firmaDerX + 300, firmaY);
        ctx.stroke();

        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText(empresaData.lider, firmaDerX, firmaY + 55);
        ctx.font = "36px Arial";
        ctx.fillText(empresaData.cargoLider, firmaDerX, firmaY + 100);
      }

      // Contacto centrado - MUCHO MÁS ABAJO
      const contactoY = height - 150; // Casi al borde inferior
      const iconSize = 50;
      ctx.font = "36px Arial";
      
      const iconPhonePath = path.join(__dirname, "../../public/phone.svg");
      if (empresaData.telefono && fs.existsSync(iconPhonePath)) {
        try {
          const iconPhone = await loadImage(iconPhonePath);
          const textWidth = ctx.measureText(empresaData.telefono).width;
          const totalWidth = iconSize + 10 + textWidth;
          const startX = width / 2 - totalWidth / 2;
          
          ctx.drawImage(iconPhone, startX, contactoY - 35, iconSize, iconSize);
          ctx.textAlign = "left";
          ctx.fillText(empresaData.telefono, startX + iconSize + 10, contactoY);
        } catch (err) {
          console.warn("Error al cargar icono teléfono:", err);
        }
      }
    } else {
      // ========================================
      // FIRMA IZQUIERDA - GERENTE GENERAL (AP/AT)
      // ========================================
      const firmaIzqPath = path.join(__dirname, "../../public/Firma2.jpg");
      if (fs.existsSync(firmaIzqPath)) {
        try {
          const firmaIzqImg = await loadImage(firmaIzqPath);
          const firmaWidth = 350;
          const firmaHeight = (firmaIzqImg.height / firmaIzqImg.width) * firmaWidth;
          ctx.drawImage(firmaIzqImg, firmaIzqX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
        } catch (err) {
          console.warn("Error al cargar Firma2.jpg:", err);
        }
      }

      ctx.beginPath();
      ctx.moveTo(firmaIzqX - 300, firmaY);
      ctx.lineTo(firmaIzqX + 300, firmaY);
      ctx.stroke();

      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.fillText(empresaData.gerente, firmaIzqX, firmaY + 55);
      ctx.font = "36px Arial";
      ctx.fillText("Gerente General", firmaIzqX, firmaY + 100);

      // ========================================
      // INFORMACIÓN DE CONTACTO - MUCHO MÁS ABAJO (AP/AT)
      // ========================================
      const contactoY = height - 150; // Casi al borde inferior
      const iconSize = 50;
      ctx.font = "36px Arial";
      ctx.fillStyle = "#000000";

      const iconPaths = {
        location: path.join(__dirname, "../../public/map-pin.svg"),
        phone: path.join(__dirname, "../../public/phone.svg"),
        email: path.join(__dirname, "../../public/mail.svg")
      };

      ctx.textAlign = "left";
      let totalWidth = 0;
      
      if (empresaData.direccion) {
        totalWidth += iconSize + 10 + ctx.measureText(empresaData.direccion).width + 60;
      }
      if (empresaData.telefono) {
        totalWidth += iconSize + 10 + ctx.measureText(empresaData.telefono).width + 60;
      }
      if (empresaData.email) {
        totalWidth += iconSize + 10 + ctx.measureText(empresaData.email).width;
      }

      const startX = (width - totalWidth) / 2;
      let currentX = startX;

      if (empresaData.direccion) {
        try {
          if (fs.existsSync(iconPaths.location)) {
            const iconLocation = await loadImage(iconPaths.location);
            ctx.drawImage(iconLocation, currentX, contactoY - 35, iconSize, iconSize);
          }
          ctx.textAlign = "left";
          ctx.fillText(empresaData.direccion, currentX + iconSize + 10, contactoY);
          currentX += iconSize + 10 + ctx.measureText(empresaData.direccion).width + 60;
        } catch (err) {
          console.warn("Error al cargar icono ubicación:", err);
        }
      }

      if (empresaData.telefono) {
        try {
          if (fs.existsSync(iconPaths.phone)) {
            const iconPhone = await loadImage(iconPaths.phone);
            ctx.drawImage(iconPhone, currentX, contactoY - 35, iconSize, iconSize);
          }
          ctx.textAlign = "left";
          ctx.fillText(empresaData.telefono, currentX + iconSize + 10, contactoY);
          currentX += iconSize + 10 + ctx.measureText(empresaData.telefono).width + 60;
        } catch (err) {
          console.warn("Error al cargar icono teléfono:", err);
        }
      }

      if (empresaData.email) {
        try {
          if (fs.existsSync(iconPaths.email)) {
            const iconEmail = await loadImage(iconPaths.email);
            ctx.drawImage(iconEmail, currentX, contactoY - 35, iconSize, iconSize);
          }
          ctx.textAlign = "left";
          ctx.fillText(empresaData.email, currentX + iconSize + 10, contactoY);
        } catch (err) {
          console.warn("Error al cargar icono email:", err);
        }
      }

      // ========================================
      // FIRMA DERECHA - LÍDER DE GESTIÓN HUMANA (AP/AT)
      // ========================================
      if (empresaData.lider) {
        const firmaDerPath = path.join(__dirname, "../../public/Firma1.jpg");
        if (fs.existsSync(firmaDerPath)) {
          try {
            const firmaDerImg = await loadImage(firmaDerPath);
            const firmaWidth = 350;
            const firmaHeight = (firmaDerImg.height / firmaDerImg.width) * firmaWidth;
            ctx.drawImage(firmaDerImg, firmaDerX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
          } catch (err) {
            console.warn("Error al cargar Firma1.jpg:", err);
          }
        }

        ctx.beginPath();
        ctx.moveTo(firmaDerX - 300, firmaY);
        ctx.lineTo(firmaDerX + 300, firmaY);
        ctx.stroke();

        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText(empresaData.lider, firmaDerX, firmaY + 55);
        ctx.font = "36px Arial";
        ctx.fillText(empresaData.cargoLider, firmaDerX, firmaY + 100);
      }
    }

    // ========================================
    // CONVERTIR Y ENVIAR IMAGEN
    // ========================================
    console.log("🖼️ Convirtiendo canvas a PNG...");
    const buffer = canvas.toBuffer("image/png");
    console.log("✅ Buffer generado, tamaño:", buffer.length, "bytes");

    // Incrementar contador de certificados generados
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    console.log("✅ Contador de certificados actualizado:", usuario.certificadosGenerados);

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificado_${usuario.name}_${usuario.lastName}.png"`
    );
    console.log("📤 Enviando imagen PNG al cliente...");
    res.send(buffer);
    console.log("✅ CERTIFICADO ENVIADO CORRECTAMENTE");
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
    const usuario: any = await User.findByPk(Uid, {
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
    const fechaIngreso = formatDateSpanish(
      new Date(usuario.createdAt || Date.now())
    );

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
          labora en nuestra empresa como <strong>${
            usuario.area?.Aname || "Sin cargo"
          }</strong> 
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
        
        ${
          empresaData.lider
            ? `
        <div class="firma">
          <div class="linea-firma"></div>
          <p class="firma-nombre">${empresaData.lider}</p>
          <p class="firma-cargo">${empresaData.cargoLider}</p>
          ${
            usuario.empresa === "ME" && empresaData.telefono
              ? `<p class="firma-contacto">${empresaData.telefono}</p>`
              : ""
          }
        </div>
        `
            : ""
        }
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
export const generarCertificadoCesantias = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;
  const { conFirma, empresa } = req.query; // 'true' o 'false' + empresa (AP, AT, ME)
  
  try {
    const usuario: any = await User.findByPk(Uid, {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    // Usar empresa del query o la del usuario
    const empresaSeleccionada = (empresa as string) || usuario.empresa || "AP";
    const empresaData = empresasData[empresaSeleccionada];
    
    // Obtener datos del query o usar datos del usuario
    const nombreCompleto = (req.query.nombreCompleto as string) || `${usuario.name} ${usuario.lastName}`;
    const cedula = (req.query.cedula as string) || usuario.documentoIdentificacion;
    const fondoCesantias = (req.query.fondoCesantias as string) || usuario.fondoCesantias || 'PORVENIR';
    const tipoRetiro = (req.query.tipoRetiro as string) || 'RETIRO TOTAL';
    const conceptoRetiro = req.query.conceptoRetiro as string || 'TERMINACIÓN DEL CONTRATO DE TRABAJO';
    const valorAutorizado = req.query.valorAutorizado as string || 'RETIRO TOTAL';
    const causa = req.query.causa as string || 'RETIRO CON INJUSTA CAUSA';
    
    // Crear canvas
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // ========================================
    // MARCA DE AGUA DEL LOGO (fondo)
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    if (fs.existsSync(logoPath)) {
      ctx.save();
      ctx.globalAlpha = 0.05; // Muy transparente para marca de agua
      
      const logoWatermark = await loadImage(logoPath);
      const watermarkSize = 2000;
      const watermarkHeight = (logoWatermark.height / logoWatermark.width) * watermarkSize;
      const watermarkX = (width - watermarkSize) / 2;
      const watermarkY = (height - watermarkHeight) / 2;

      ctx.drawImage(logoWatermark, watermarkX, watermarkY, watermarkSize, watermarkHeight);
      ctx.restore();
    }

    // ========================================
    // LOGO EN LA PARTE SUPERIOR
    // ========================================
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      const logoWidth = 500;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      const logoY = empresaSeleccionada === 'ME' ? 250 : 150;
      ctx.drawImage(logo, (width - logoWidth) / 2, logoY, logoWidth, logoHeight);
    }

    // Fecha - más abajo
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.font = "44px 'Helvetica'";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    
    let fechaY = 700;
    if (empresaSeleccionada === 'ME') fechaY = 800;
    ctx.fillText(`Pereira, ${fecha}`, 200, fechaY);

    // Espacio grande después de la fecha
    let yPos = fechaY + 170;

    // Título "Señores"
    ctx.font = "44px 'Helvetica'";
    ctx.fillText("Señores", 200, yPos);
    yPos += 55;
    ctx.font = "bold 44px 'Helvetica'";
    ctx.fillText(fondoCesantias.toUpperCase(), 200, yPos);

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
    const texto = `Mediante el presente documento yo ${empresaData.gerente.toUpperCase()} identificado con cedula de ciudadanía número ${empresaData.cedulaGerente} y con domicilio en Pereira, actuando en calidad de empleador, con razón social ${empresaData.nombre}${empresaData.nit ? ' ' + empresaData.nit : ''} me permito informar que he AUTORIZADO el ${tipoRetiro.toUpperCase()} de cesantías del trabajador (a) así,`;
    
    yPos = wrapText(ctx, texto, marginLeft, yPos, contentWidth, 65);

    // Espacio entre párrafos
    yPos += 150;

    // EMPLEADO
    ctx.font = "42px 'Helvetica'";
    ctx.fillText(`EMPLEADO: ${nombreCompleto.toUpperCase()}`, marginLeft, yPos);
    
    yPos += 75;
    ctx.fillText(`CEDULA DE CIUDADANIA: ${cedula}`, marginLeft, yPos);
    
    yPos += 75;
    ctx.fillText(`CONCEPTO DE RETIRO: ${conceptoRetiro.toUpperCase()}`, marginLeft, yPos);
    
    yPos += 75;
    ctx.fillText(`VALOR AUTORIZADO: ${valorAutorizado.toUpperCase()}`, marginLeft, yPos);
    
    yPos += 75;
    ctx.fillText(`CAUSA: ${causa.toUpperCase()}`, marginLeft, yPos);

    yPos += 180;

    // Último párrafo
    const textoFinal = `Lo anterior de conformidad con lo establecido en el decreto 1072 de 2024, artículos 2.2.1.3.15 a 2.2.1.3.19 y el Decreto 1562 de 2019.`;
    wrapText(ctx, textoFinal, marginLeft, yPos, contentWidth, 65);

    // ========================================
    // FIRMA Y PIE DE PÁGINA - MUCHO MÁS ABAJO
    // ========================================
    const firmaY = height - 650; // Casi al final de la página

    // Si conFirma='true', mostrar AMBAS firmas (gerente + espacio para empleado)
    if (conFirma === 'true') {
      // FIRMA DEL GERENTE (IZQUIERDA) - 20% del ancho
      const firmaGerenteX = width * 0.20;
      
      // Determinar qué firma usar según la empresa
      const firmaFileName = empresaSeleccionada === 'ME' ? 'Firma3.jpeg' : 'Firma2.jpg';
      const firmaPath = path.join(__dirname, "../../public", firmaFileName);
      
      if (fs.existsSync(firmaPath)) {
        const firmaImg = await loadImage(firmaPath);
        const firmaWidth = 350;
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
        ctx.drawImage(firmaImg, firmaGerenteX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
      }

      // Línea de firma del gerente
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(firmaGerenteX - 350, firmaY);
      ctx.lineTo(firmaGerenteX + 350, firmaY);
      ctx.stroke();

      // Información del gerente
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
      
      // Determinar qué firma usar según la empresa
      const firmaFileName = empresaSeleccionada === 'ME' ? 'Firma3.jpeg' : 'Firma2.jpg';
      const firmaPath = path.join(__dirname, "../../public", firmaFileName);
      
      if (fs.existsSync(firmaPath)) {
        const firmaImg = await loadImage(firmaPath);
        const firmaWidth = 350;
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
        ctx.drawImage(firmaImg, firmaX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
      }

      // Línea de firma
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(firmaX - 350, firmaY);
      ctx.lineTo(firmaX + 350, firmaY);
      ctx.stroke();

      // Información del firmante
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
    // ICONOS DE CONTACTO EN EL PIE DE PÁGINA - MUCHO MÁS ABAJO
    // ========================================
    const footerY = height - 120; // Casi al borde inferior
    const iconSize = 45;
    
    // Cargar iconos
    const iconPaths = {
      location: path.join(__dirname, "../../public/map-pin.svg"),
      phone: path.join(__dirname, "../../public/phone.svg"),
      email: path.join(__dirname, "../../public/mail.svg")
    };

    ctx.font = "36px 'Helvetica'";
    
    // Calcular ancho total para centrar
    let totalWidth = 0;
    if (empresaData.direccion) {
      totalWidth += iconSize + 10 + ctx.measureText(empresaData.direccion).width + 60;
    }
    if (empresaData.telefono) {
      totalWidth += iconSize + 10 + ctx.measureText(empresaData.telefono).width + 60;
    }
    if (empresaData.email) {
      totalWidth += iconSize + 10 + ctx.measureText(empresaData.email).width;
    }

    let currentX = (width - totalWidth) / 2;

    // UBICACIÓN
    if (empresaData.direccion) {
      try {
        if (fs.existsSync(iconPaths.location)) {
          const iconLocation = await loadImage(iconPaths.location);
          ctx.drawImage(iconLocation, currentX, footerY - 32, iconSize, iconSize);
        }
        ctx.textAlign = "left";
        ctx.fillText(empresaData.direccion, currentX + iconSize + 10, footerY);
        currentX += iconSize + 10 + ctx.measureText(empresaData.direccion).width + 60;
      } catch (err) {
        console.warn("Error al cargar icono ubicación:", err);
      }
    }

    // TELÉFONO
    if (empresaData.telefono) {
      try {
        if (fs.existsSync(iconPaths.phone)) {
          const iconPhone = await loadImage(iconPaths.phone);
          ctx.drawImage(iconPhone, currentX, footerY - 32, iconSize, iconSize);
        }
        ctx.textAlign = "left";
        ctx.fillText(empresaData.telefono, currentX + iconSize + 10, footerY);
        currentX += iconSize + 10 + ctx.measureText(empresaData.telefono).width + 60;
      } catch (err) {
        console.warn("Error al cargar icono teléfono:", err);
      }
    }

    // EMAIL
    if (empresaData.email) {
      try {
        if (fs.existsSync(iconPaths.email)) {
          const iconEmail = await loadImage(iconPaths.email);
          ctx.drawImage(iconEmail, currentX, footerY - 32, iconSize, iconSize);
        }
        ctx.textAlign = "left";
        ctx.fillText(empresaData.email, currentX + iconSize + 10, footerY);
      } catch (err) {
        console.warn("Error al cargar icono email:", err);
      }
    }

    // Convertir y enviar
    const buffer = canvas.toBuffer("image/png");
    
    // Incrementar contador de certificados generados SOLO en la primera versión (sin firma)
    // Para evitar contar 2 veces cuando se generan ambas versiones (digital + manual)
    if (conFirma === 'false' || !conFirma) {
      usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
      await usuario.save();
      console.log(`✅ Contador incrementado para ${usuario.name} ${usuario.lastName}: ${usuario.certificadosGenerados}`);
    }
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="cesantias_${Uid}.png"`);
    res.send(buffer);

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
export const generarCertificadoTerminacion = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;
  const { conFirma, empresa } = req.query;
  
  try {
    const usuario: any = await User.findByPk(Uid, {
      include: [{ model: Area, as: "area" }],
    });

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${Uid}`,
      });
    }

    // Usar empresa del query o la del usuario
    const empresaSeleccionada = (empresa as string) || usuario.empresa || "AP";
    const empresaData = empresasData[empresaSeleccionada];
    
    // Obtener datos
    const nombreCompleto = (req.query.nombreCompleto as string) || `${usuario.name} ${usuario.lastName}`;
    const cedula = (req.query.cedula as string) || usuario.documentoIdentificacion;
    const cargo = (req.query.cargo as string) || usuario.cargo || 'Sin cargo';
    const salario = parseFloat(req.query.salario as string) || usuario.salario || 0;
    
    // Formatear fechas correctamente
    const fechaIngresoRaw = usuario.fechaIngreso ? new Date(usuario.fechaIngreso) : new Date(usuario.createdAt);
    const fechaIngreso = formatDateSimple(fechaIngresoRaw);
    
    // Convertir fechaSalida de formato YYYY-MM-DD a texto legible
    const fechaSalidaQuery = req.query.fechaSalida as string || '';
    const fechaSalida = fechaSalidaQuery ? formatDateSimple(new Date(fechaSalidaQuery)) : '';
    
    const tipoTerminacion = req.query.tipoTerminacion as string || 'terminacion-unilateral-voluntaria';
    
    // Obtener tipo de contrato del usuario o del query
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
    }

    // Crear canvas
    const width = 2480;
    const height = 3508;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // ========================================
    // MARCA DE AGUA DEL LOGO (fondo)
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    if (fs.existsSync(logoPath)) {
      ctx.save();
      ctx.globalAlpha = 0.05; // Muy transparente para marca de agua
      
      const logoWatermark = await loadImage(logoPath);
      const watermarkSize = 2000;
      const watermarkHeight = (logoWatermark.height / logoWatermark.width) * watermarkSize;
      const watermarkX = (width - watermarkSize) / 2;
      const watermarkY = (height - watermarkHeight) / 2;

      ctx.drawImage(logoWatermark, watermarkX, watermarkY, watermarkSize, watermarkHeight);
      ctx.restore();
    }

    // ========================================
    // LOGO EN LA PARTE SUPERIOR
    // ========================================
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      const logoWidth = 500;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      // Para ME, bajar más el logo
      const logoY = empresaSeleccionada === 'ME' ? 250 : 150;
      ctx.drawImage(logo, (width - logoWidth) / 2, logoY, logoWidth, logoHeight);
    }

    // Título - más profesional y espaciado
    ctx.font = "bold 95px 'Helvetica'";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    
    // Bajar más el título
    let tituloY = 900;
    if (empresaSeleccionada === 'ME') tituloY = 950;
    
    ctx.fillText("CERTIFICADO DE TERMINACIÓN", width / 2, tituloY);
    ctx.fillText("DE CONTRATO", width / 2, tituloY + 120);

    // Info empresa - más abajo y con mejor espaciado
    ctx.font = "bold 56px 'Helvetica'";
    ctx.fillText(empresaData.nombre, width / 2, tituloY + 300);
    if (empresaData.nit) {
      ctx.font = "bold 46px 'Helvetica'";
      ctx.fillText(empresaData.nit, width / 2, tituloY + 370);
    }

    // Contenido - mejor distribuido con más espacio entre secciones
    const marginLeft = 300;
    const contentWidth = width - 600;
    let yPos = tituloY + 550; // Más espacio después del nombre de la empresa

    ctx.textAlign = "left";
    ctx.font = "46px 'Helvetica'"; // Texto ligeramente más grande para mejor lectura
    
    const parrafo = `Por medio de la presente, hacemos constar que el (la) señor (a) ${nombreCompleto.toUpperCase()}, identificado (a) con CÉDULA DE CIUDADANÍA ${cedula}, ${textoTerminacion}`;
    
    yPos = wrapText(ctx, parrafo, marginLeft, yPos, contentWidth, 80) + 150;

    const parrafo2 = `Para constancia, se firma a los ${formatDateSimple(new Date())}.`;
    wrapText(ctx, parrafo2, marginLeft, yPos, contentWidth, 80);

    // Firma - MUCHO MÁS ABAJO, casi al final
    const firmaY = height - 450; // Casi al borde inferior

    if (conFirma === 'true') {
      // FIRMA DEL GERENTE (IZQUIERDA) - 20% del ancho
      const firmaGerenteX = width * 0.20;
      
      // Determinar qué firma usar según la empresa
      const firmaFileName = empresaSeleccionada === 'ME' ? 'Firma3.jpeg' : 'Firma2.jpg';
      const firmaPath = path.join(__dirname, "../../public", firmaFileName);
      
      if (fs.existsSync(firmaPath)) {
        const firmaImg = await loadImage(firmaPath);
        const firmaWidth = 350;
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
        ctx.drawImage(firmaImg, firmaGerenteX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
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

      // FIRMA DEL EMPLEADO (DERECHA) - 80% del ancho
      const firmaEmpleadoX = width * 0.80;
      ctx.font = "38px 'Helvetica'";
      ctx.fillText("FIRMA: _____________________________", firmaEmpleadoX, firmaY);
      ctx.fillText("CÉDULA: ____________________________", firmaEmpleadoX, firmaY + 100);
      
    } else {
      // SOLO FIRMA DEL GERENTE (CENTRADA)
      const firmaX = width / 2;
      
      // Determinar qué firma usar según la empresa
      const firmaFileName = empresaSeleccionada === 'ME' ? 'Firma3.jpeg' : 'Firma2.jpg';
      const firmaPath = path.join(__dirname, "../../public", firmaFileName);
      
      if (fs.existsSync(firmaPath)) {
        const firmaImg = await loadImage(firmaPath);
        const firmaWidth = 350;
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth;
        ctx.drawImage(firmaImg, firmaX - firmaWidth/2, firmaY - firmaHeight - 20, firmaWidth, firmaHeight);
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

    // NO INCLUIR FOOTER DE CONTACTO PARA TERMINACIÓN

    // Convertir y enviar
    const buffer = canvas.toBuffer("image/png");
    
    // Incrementar contador de certificados generados SOLO en la primera versión (sin firma)
    // Para evitar contar 2 veces cuando se generan ambas versiones (digital + manual)
    if (conFirma === 'false' || !conFirma) {
      usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
      await usuario.save();
      console.log(`✅ Contador incrementado para ${usuario.name} ${usuario.lastName}: ${usuario.certificadosGenerados}`);
    }
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="terminacion_${Uid}.png"`);
    res.send(buffer);

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

    const usuario = await User.findByPk(Uid);
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

    const area = await Area.findByPk(usuario.Aid);
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

    // Determinar empresa
    let empresaData: any = {};
    if (usuario.empresa === "ME") {
      empresaData = {
        nombre: "MARIA EVANGELINA AGUDELO GIL",
        nit: "NIT 42094435",
        logo: "Logo3.png"
      };
    } else if (usuario.empresa === "AP") {
      empresaData = {
        nombre: "ANDRÉS PUBLICIDAD TG SAS",
        nit: "NIT 901.458.142-2",
        logo: "Logo2.png"
      };
    } else { // AT
      empresaData = {
        nombre: "ANDRÉS TOBÓN",
        nit: "CC 1088254149",
        logo: "Logo1.png"
      };
    }

    // Cargar logo
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    let logo: any = null;
    if (fs.existsSync(logoPath)) {
      logo = await loadImage(logoPath);
    }

    // Dibujar logo (esquina superior izquierda)
    if (logo) {
      const logoSize = 300;
      ctx.drawImage(logo, margin, margin, logoSize, logoSize);
    }

    // Encabezado - Empresa
    ctx.fillStyle = "#000000";
    ctx.font = "bold 48px Helvetica";
    ctx.textAlign = "center";
    const headerY = margin + 100;
    ctx.fillText(empresaData.nombre, width / 2, headerY);
    
    ctx.font = "42px Helvetica";
    ctx.fillText(empresaData.nit, width / 2, headerY + 60);
    
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

    // Convertir y enviar
    const buffer = canvas.toBuffer("image/png");
    
    // Incrementar contador de certificados generados
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="desprendible_${Uid}_${fechaPago.replace(/\//g, '-')}.png"`);
    res.send(buffer);

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
      tipoVacaciones, // 'solo-vacaciones' o 'vacaciones-pagos'
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

    const usuario: any = await User.findByPk(Uid, {
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

    // Determinar empresa
    let empresaData: any = {};
    if (usuario.empresa === "ME") {
      empresaData = {
        nombre: "MARIA EVANGELINA AGUDELO GIL",
        nit: "NIT 42094435",
        logo: "Logo3.png"
      };
    } else if (usuario.empresa === "AP") {
      empresaData = {
        nombre: "ANDRÉS PUBLICIDAD TG SAS",
        nit: "NIT 901.458.142-2",
        logo: "Logo2.png"
      };
    } else {
      empresaData = {
        nombre: "ANDRÉS TOBÓN",
        nit: "CC 1088254149",
        logo: "Logo1.png"
      };
    }

    // ========================================
    // MARCA DE AGUA DEL LOGO (fondo)
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    if (fs.existsSync(logoPath)) {
      ctx.save();
      ctx.globalAlpha = 0.05; // Muy transparente para marca de agua
      
      const logoWatermark = await loadImage(logoPath);
      const watermarkSize = 1800;
      const watermarkHeight = (logoWatermark.height / logoWatermark.width) * watermarkSize;
      const watermarkX = (width - watermarkSize) / 2;
      const watermarkY = (height - watermarkHeight) / 2;

      ctx.drawImage(logoWatermark, watermarkX, watermarkY, watermarkSize, watermarkHeight);
      ctx.restore();
    }

    // Logo principal en la parte superior central
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      const logoWidth = 400;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      const logoX = (width - logoWidth) / 2;
      ctx.drawImage(logo, logoX, 180, logoWidth, logoHeight);
    }

    // Encabezado - centrado y bien espaciado
    ctx.fillStyle = "#000000";
    ctx.font = "bold 58px Helvetica";
    ctx.textAlign = "center";
    const headerY = 750; // Posición fija para mejor simetría
    ctx.fillText(empresaData.nombre, width / 2, headerY);
    
    ctx.font = "48px Helvetica";
    ctx.fillText(empresaData.nit, width / 2, headerY + 90);
    
    // Línea decorativa
    ctx.strokeStyle = "#FFD600";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 400, headerY + 130);
    ctx.lineTo(width / 2 + 400, headerY + 130);
    ctx.stroke();
    
    ctx.font = "bold 72px Helvetica";
    ctx.fillStyle = "#000000";
    ctx.fillText("CERTIFICADO DE VACACIONES", width / 2, headerY + 250);

    ctx.font = "bold 72px Helvetica";
    ctx.fillStyle = "#000000";
    ctx.fillText("CERTIFICADO DE VACACIONES", width / 2, headerY + 250);

    // Fecha actual - más espaciada
    const hoy = new Date();
    const fechaActual = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;
    ctx.font = "46px Helvetica";
    ctx.fillText(`Fecha de expedición: ${fechaActual}`, width / 2, headerY + 360);

    // Contenido del certificado - centrado y prolijo
    const contentY = headerY + 520; // Más espacio para mejor distribución
    ctx.font = "48px Helvetica";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";

    const lineHeight = 90; // Mayor espaciado entre líneas
    let currentY = contentY;

    // Texto principal con mejor formato
    ctx.font = "46px Helvetica";
    const texto1 = `Por medio de la presente, certificamos que:`;
    ctx.fillText(texto1, margin, currentY);
    currentY += lineHeight * 1.8;

    // Nombre del empleado - destacado
    ctx.font = "bold 56px Helvetica";
    ctx.fillStyle = "#1a5490";
    ctx.fillText(nombreCompleto, margin, currentY);
    ctx.fillStyle = "#000000";
    currentY += lineHeight * 1.3;

    // Cédula con mejor espaciado
    ctx.font = "46px Helvetica";
    ctx.fillText(`Identificado(a) con cédula de ciudadanía No. ${usuario.documentoIdentificacion}`, 
                 margin, currentY);
    currentY += lineHeight * 1.5;

    // Área/Cargo
    ctx.fillText(`Quien se desempeña como ${area?.Aname || usuario.cargo || 'Colaborador'}`,
                 margin, currentY);
    currentY += lineHeight * 1.8;

    // Solicitud de vacaciones - destacado
    ctx.font = "bold 50px Helvetica";
    ctx.fillText(`Ha solicitado ${diasReales} ${diasReales === 1 ? 'día laboral' : 'días laborales'}`,
                 margin, currentY);
    currentY += lineHeight;
    
    ctx.font = "46px Helvetica";
    ctx.fillText(`de ${tipoVacaciones === 'vacaciones-pagos' ? 'vacaciones y días pagos' : 'vacaciones'}`,
                 margin, currentY);
    currentY += lineHeight * 1.8;

    // Fechas en formato de tabla
    ctx.font = "bold 46px Helvetica";
    ctx.fillText(`Período de vacaciones:`, margin, currentY);
    currentY += lineHeight * 1.2;
    
    ctx.font = "46px Helvetica";
    ctx.fillText(`    Desde:  ${fechaInicio}`, margin, currentY);
    currentY += lineHeight;
    
    ctx.fillText(`    Hasta:   ${fechaFin}`, margin, currentY);
    currentY += lineHeight * 1.2;
    
    // Información de días laborales - destacada
    ctx.font = "42px Helvetica";
    ctx.fillStyle = "#666666";
    ctx.fillText(`✓ ${diasReales} días laborales (excluyendo fines de semana y festivos)`,
                 margin + 20, currentY);
    ctx.fillStyle = "#000000";
    currentY += lineHeight * 1.8;

    ctx.fillStyle = "#000000";
    currentY += lineHeight * 1.8;

    // Detalle de días según tipo - mejorado visualmente
    if (tipoVacaciones === 'vacaciones-pagos') {
      const diasVacaciones = Math.min(diasReales, 15);
      const diasPagos = Math.max(0, diasReales - 15);
      
      ctx.font = "bold 46px Helvetica";
      ctx.fillText(`Distribución de días:`, margin, currentY);
      currentY += lineHeight * 1.2;
      
      ctx.font = "46px Helvetica";
      ctx.fillText(`    • Días de vacaciones: ${diasVacaciones}`,
                   margin + 20, currentY);
      currentY += lineHeight;
      
      if (diasPagos > 0) {
        ctx.fillText(`    • Días pagos adicionales: ${diasPagos}`,
                     margin + 20, currentY);
        currentY += lineHeight;
      }
      currentY += lineHeight;
    }

    // Solicitud de cabaña - más destacado
    if (solicitaCabana) {
      // Recuadro con fondo amarillo
      ctx.fillStyle = "#FFF9E6";
      ctx.fillRect(margin - 30, currentY - 70, contentWidth + 60, 280);
      
      // Borde del recuadro
      ctx.strokeStyle = "#FFD600";
      ctx.lineWidth = 5;
      ctx.strokeRect(margin - 30, currentY - 70, contentWidth + 60, 280);
      
      ctx.font = "bold 52px Helvetica";
      ctx.fillStyle = "#B8860B"; // Color dorado oscuro
      ctx.fillText(`🏡 SOLICITA CABAÑA DE DESCANSO`,
                   margin, currentY);
      currentY += lineHeight * 1.3;
      
      ctx.font = "44px Helvetica";
      ctx.fillStyle = "#000000";
      const textoCabana = `El empleado ha solicitado hacer uso de la cabaña de la empresa`;
      ctx.fillText(textoCabana, margin, currentY);
      currentY += lineHeight;
      ctx.fillText(`durante el período de vacaciones.`, margin, currentY);
      currentY += lineHeight * 1.8;
    } else {
      currentY += lineHeight * 0.5;
    }

    // Texto final - más profesional
    ctx.font = "46px Helvetica";
    ctx.fillStyle = "#000000";
    ctx.fillText(`Se expide el presente certificado a solicitud del interesado para los fines`,
                 margin, currentY);
    currentY += lineHeight;
    ctx.fillText(`que el empleado estime convenientes.`,
                 margin, currentY);

    // Firmas - MUCHO MÁS ABAJO y centradas
    const firmaY = height - 500; // Casi al borde inferior
    
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
    ctx.font = "bold 46px Helvetica";
    ctx.textAlign = "center";
    ctx.fillText("Firma y Sello Autorizado", width / 2, firmaY + 70);
    
    ctx.font = "44px Helvetica";
    ctx.fillText("Recursos Humanos", width / 2, firmaY + 130);
    
    // Pie de página con línea decorativa
    const footerY = height - 200;
    ctx.strokeStyle = "#FFD600";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, footerY);
    ctx.lineTo(width - margin, footerY);
    ctx.stroke();
    
    ctx.font = "38px Helvetica";
    ctx.fillStyle = "#666666";
    ctx.fillText("Documento válido solo con firma y sello", width / 2, footerY + 50);

    // Convertir y enviar
    const buffer = canvas.toBuffer("image/png");
    
    // Incrementar contador
    usuario.certificadosGenerados = (usuario.certificadosGenerados || 0) + 1;
    await usuario.save();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 
      `attachment; filename="vacaciones_${Uid}_${fechaInicio.replace(/\//g, '-')}.png"`);
    res.send(buffer);

  } catch (error: any) {
    console.error("Error generando certificado de vacaciones:", error);
    res.status(500).json({
      error: "Error al generar el certificado de vacaciones",
      message: error.message || error,
    });
  }
};
