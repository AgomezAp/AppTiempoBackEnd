// update_membrete.js - Actualiza el membrete de los certificados en certificado.ts
const fs = require('fs');
const filePath = 'c:/Users/DESARROLLO/Documents/Codigos/AppTiempoBackEnd/src/controllers/certificado.ts';
let code = fs.readFileSync(filePath, 'utf8');
// Normalizar a LF para que los anchors funcionen en Windows
const hasCRLF = code.includes('\r\n');
if (hasCRLF) code = code.replace(/\r\n/g, '\n');

// ========================
// PASO 1: Insertar las funciones helper ANTES de "// Generar certificado como IMAGEN"
// ========================
const helperFunctions = `// ==========================================
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

  // 4. Marca de agua centrada (muy transparente)
  const watermarkFile = empresaData.watermark || empresaData.logo;
  const watermarkPath = path.join(__dirname, '../../public', watermarkFile);
  if (fs.existsSync(watermarkPath)) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.07;
      const wm = await loadImage(watermarkPath);
      const wmSize = 1800;
      const wmH = (wm.height / wm.width) * wmSize;
      ctx.drawImage(wm, (width - wmSize) / 2, (height - wmH) / 2, wmSize, wmH);
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

  // 6. Texto adicional debajo del logo para ME
  if (empresa === 'ME') {
    const color = empresaData.accentColor || '#C9A053';
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px Arial';
    ctx.fillStyle = '#000000';
    const nameY = logoBottomY + 55;
    ctx.fillText('Maria Evangelina Agudelo Gil', width / 2, nameY);
    ctx.font = 'bold 34px Arial';
    const subtitleText = 'DISEÑO Y ADMINISTRACIÓN WEB';
    const textW = ctx.measureText(subtitleText).width;
    const padding = 50;
    const boxW = textW + padding * 2;
    const boxH = 52;
    const boxX = (width - boxW) / 2;
    const subtitleY = nameY + 72;
    ctx.fillStyle = color;
    ctx.fillRect(boxX, subtitleY - boxH + 14, boxW, boxH);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(subtitleText, width / 2, subtitleY);
    logoBottomY = subtitleY + 30;
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
    const topY = cy - iconSize * 0.48;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = iconSize * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx2, topY + iconSize * 0.3, iconSize * 0.32, Math.PI * 1.0, Math.PI * 2.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx2 - iconSize * 0.32, topY + iconSize * 0.3);
    ctx.lineTo(cx2 - iconSize * 0.32, cy + iconSize * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx2 + iconSize * 0.32, topY + iconSize * 0.3);
    ctx.lineTo(cx2 + iconSize * 0.32, cy + iconSize * 0.12);
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

`;

// Insertar antes de "// Generar certificado como IMAGEN\n// Generar certificado como IMAGEN"
const anchorInsert = '// Generar certificado como IMAGEN\n// Generar certificado como IMAGEN';
if (code.includes(anchorInsert)) {
  code = code.replace(anchorInsert, helperFunctions + anchorInsert);
  console.log('✅ Helper functions insertadas');
} else {
  console.error('❌ Anchor para inserción no encontrado');
  process.exit(1);
}

// ========================
// PASO 2: Actualizar generarCertificadoImagen
// ========================

// Reemplazar: fondo blanco + logo + watermark (bloque grande)
const oldImagen_header = `    // Fondo blanco
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
    // ========================================`;

const newImagen_header = `    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    const empresa = usuario.empresa || 'AP';
    const headerBottomY = await drawLetterhead(ctx, width, height, empresaData, empresa);

    // ========================================
    // TÍTULO "CERTIFICADO LABORAL" - MÁS PEQUEÑO
    // ========================================`;

if (code.includes(oldImagen_header)) {
  code = code.replace(oldImagen_header, newImagen_header);
  console.log('✅ generarCertificadoImagen: header actualizado');
} else {
  console.warn('⚠️ generarCertificadoImagen: header anchor no encontrado, buscando alternativa...');
}

// Reemplazar la sección de footer/contacto en generarCertificadoImagen (ME branch y AP/AT branch)
// La sección inicia con "} else {" de AP/AT y tiene los iconos de contacto

// Footer de AP/AT dentro de la función generarCertificadoImagen (la que tiene "INFORMACIÓN DE CONTACTO - MUCHO MÁS ABAJO (AP/AT)")
const oldImagen_footer_APAT = `      // ========================================
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
      // ========================================`;

const newImagen_footer_APAT = `      // ========================================
      // PIE DE PÁGINA (barra coloreada con iconos)
      // ========================================
      await drawFooterBar(ctx, width, height, empresaData, empresa);

      // ========================================
      // FIRMA DERECHA - LÍDER DE GESTIÓN HUMANA (AP/AT)
      // ========================================`;

if (code.includes(oldImagen_footer_APAT)) {
  code = code.replace(oldImagen_footer_APAT, newImagen_footer_APAT);
  console.log('✅ generarCertificadoImagen: footer AP/AT actualizado');
} else {
  console.warn('⚠️ generarCertificadoImagen: footer AP/AT anchor no encontrado');
}

// Footer de ME dentro de generarCertificadoImagen
const oldImagen_footer_ME = `      const contactoY = height - 150; // Casi al borde inferior
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
    } else {`;

const newImagen_footer_ME = `      // ========================================
      // PIE DE PÁGINA ME (barra dorada con iconos)
      // ========================================
      await drawFooterBar(ctx, width, height, empresaData, empresa);
    } else {`;

if (code.includes(oldImagen_footer_ME)) {
  code = code.replace(oldImagen_footer_ME, newImagen_footer_ME);
  console.log('✅ generarCertificadoImagen: footer ME actualizado');
} else {
  console.warn('⚠️ generarCertificadoImagen: footer ME anchor no encontrado');
}

// ========================
// PASO 3: Actualizar generarCanvasCesantias
// ========================
const oldCesantias_header = `  // Fondo blanco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // ========================================
  // MARCA DE AGUA DEL LOGO (fondo)
  // ========================================
  const logoPath = path.join(__dirname, "../../public", empresaData.logo);
  if (fs.existsSync(logoPath)) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    
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

  // Fecha`;

const newCesantias_header = `  // ========================================
  // MEMBRETE: fondo + stripe + watermark + logo
  // ========================================
  await drawLetterhead(ctx, width, height, empresaData, empresaSeleccionada);

  // Fecha`;

if (code.includes(oldCesantias_header)) {
  code = code.replace(oldCesantias_header, newCesantias_header);
  console.log('✅ generarCanvasCesantias: header actualizado');
} else {
  console.warn('⚠️ generarCanvasCesantias: header anchor no encontrado');
}

// Footer de generarCanvasCesantias
const oldCesantias_footer = `  // ========================================
  // ICONOS DE CONTACTO EN EL PIE DE PÁGINA
  // ========================================
  const footerY = height - 120;
  const iconSize = 45;
  
  const iconPaths = {
    location: path.join(__dirname, "../../public/map-pin.svg"),
    phone: path.join(__dirname, "../../public/phone.svg"),
    email: path.join(__dirname, "../../public/mail.svg")
  };

  ctx.font = "36px 'Helvetica'";
  
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

  if (empresaData.nit && empresaData.nit.trim() !== '') {
    const nitY = footerY + 60;
    ctx.font = "bold 38px 'Helvetica'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.fillText(empresaData.nit, width / 2, nitY);
  }

  return canvas;
};`;

const newCesantias_footer = `  // ========================================
  // PIE DE PÁGINA (barra coloreada con iconos)
  // ========================================
  await drawFooterBar(ctx, width, height, empresaData, empresaSeleccionada);

  return canvas;
};`;

if (code.includes(oldCesantias_footer)) {
  code = code.replace(oldCesantias_footer, newCesantias_footer);
  console.log('✅ generarCanvasCesantias: footer actualizado');
} else {
  console.warn('⚠️ generarCanvasCesantias: footer anchor no encontrado');
}

// ========================
// PASO 4: Actualizar generarCanvasTerminacion
// ========================
const oldTerminacion_header = `  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // ========================================
  // MARCA DE AGUA DEL LOGO (fondo)
  // ========================================
  const logoPath = path.join(__dirname, "../../public", empresaData.logo);
  if (fs.existsSync(logoPath)) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    
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

  // Título`;

const newTerminacion_header = `  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // ========================================
  // MEMBRETE: fondo + stripe + watermark + logo
  // ========================================
  await drawLetterhead(ctx, width, height, empresaData, empresaSeleccionada);

  // Título`;

if (code.includes(oldTerminacion_header)) {
  code = code.replace(oldTerminacion_header, newTerminacion_header);
  console.log('✅ generarCanvasTerminacion: header actualizado');
} else {
  console.warn('⚠️ generarCanvasTerminacion: header anchor no encontrado');
}

// ========================
// PASO 5: Actualizar generarDesprendiblePago - usar empresasData global
// ========================
const oldDesprendible_empresaData = `    // Determinar empresa
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
    ctx.fillText(fechaPago, width / 2, headerY + 200);`;

const newDesprendible_empresaData = `    // Determinar empresa (usando datos globales)
    const empresaDesprendible = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaDesprendible] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    await drawLetterhead(ctx, width, height, empresaData, empresaDesprendible);
    await drawFooterBar(ctx, width, height, empresaData, empresaDesprendible);

    // Encabezado - Empresa
    ctx.fillStyle = "#000000";
    ctx.font = "bold 48px Helvetica";
    ctx.textAlign = "center";
    const headerY = 650;
    ctx.fillText(empresaData.nombre, width / 2, headerY);
    
    ctx.font = "42px Helvetica";
    if (empresaData.nit) ctx.fillText(empresaData.nit, width / 2, headerY + 60);
    
    ctx.font = "bold 46px Helvetica";
    ctx.fillText("LIQUIDACION DE NOMINA", width / 2, headerY + 140);
    
    // Fecha de pago
    ctx.font = "42px Helvetica";
    ctx.fillText(fechaPago, width / 2, headerY + 200);`;

if (code.includes(oldDesprendible_empresaData)) {
  code = code.replace(oldDesprendible_empresaData, newDesprendible_empresaData);
  console.log('✅ generarDesprendiblePago: header actualizado');
} else {
  console.warn('⚠️ generarDesprendiblePago: header anchor no encontrado');
}

// ========================
// PASO 6: Actualizar generarCertificadoVacaciones - usar empresasData global
// ========================
const oldVacaciones_header = `    // Determinar empresa
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
    // MARCA DE AGUA DEL LOGO (fondo) - SIN LOGO PRINCIPAL
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

    // ========================================
    // TÍTULO - CENTRADO Y MÁS ARRIBA
    // ========================================`;

const newVacaciones_header = `    // Determinar empresa (usando datos globales)
    const empresaVacaciones = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaVacaciones] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    await drawLetterhead(ctx, width, height, empresaData, empresaVacaciones);
    await drawFooterBar(ctx, width, height, empresaData, empresaVacaciones);

    // ========================================
    // TÍTULO - CENTRADO Y MÁS ARRIBA
    // ========================================`;

if (code.includes(oldVacaciones_header)) {
  code = code.replace(oldVacaciones_header, newVacaciones_header);
  console.log('✅ generarCertificadoVacaciones: header actualizado');
} else {
  console.warn('⚠️ generarCertificadoVacaciones: header anchor no encontrado');
}

// Reemplazar también el footer de vacaciones (línea decorativa amarilla vieja)
const oldVacaciones_footer = `    // Pie de página con línea decorativa - más abajo
    const footerY = height - 240;
    ctx.strokeStyle = "#FFD600";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, footerY);
    ctx.lineTo(width - margin, footerY);
    ctx.stroke();
    
    ctx.font = "36px Helvetica";
    ctx.fillStyle = "#666666";`;

const newVacaciones_footer = `    ctx.font = "36px Helvetica";
    ctx.fillStyle = "#666666";`;

if (code.includes(oldVacaciones_footer)) {
  code = code.replace(oldVacaciones_footer, newVacaciones_footer);
  console.log('✅ generarCertificadoVacaciones: old footer line removed');
}

// ========================
// PASO 7: Actualizar generarNotificacionVacaciones
// ========================
const oldNotif_header = `    // Determinar empresa
    let empresaData: any = {};
    if (usuario.empresa === "ME") {
      empresaData = {
        nombre: "MARIA EVANGELINA AGUDELO GIL",
        nit: "CC. 42094435",
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
    // LOGO EN LA PARTE SUPERIOR IZQUIERDA
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    let logoHeight = 0;
    if (fs.existsSync(logoPath)) {
      try {
        const logo = await loadImage(logoPath);
        let logoWidth = 350;
        let logoY = 120;
        
        logoHeight = (logo.height / logo.width) * logoWidth;
        const logoX = margin;
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } catch (logoError) {
        console.error("Error al cargar logo:", logoError);
      }
    }

    // ========================================
    // MARCA DE AGUA
    // ========================================
    if (fs.existsSync(logoPath)) {
      try {
        ctx.save();
        ctx.globalAlpha = 0.05;
        
        const logo = await loadImage(logoPath);
        const watermarkSize = 1800;
        const watermarkHeight = (logo.height / logo.width) * watermarkSize;
        const watermarkX = (width - watermarkSize) / 2;
        const watermarkY = (height - watermarkHeight) / 2;

        ctx.drawImage(logo, watermarkX, watermarkY, watermarkSize, watermarkHeight);
        ctx.restore();
      } catch (err) {
        console.error("Error al agregar marca de agua:", err);
      }
    }

    // ========================================
    // CIUDAD Y FECHA (arriba a la DERECHA, al lado del logo)
    // ========================================`;

const newNotif_header = `    // Determinar empresa (usando datos globales)
    const empresaNotif = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaNotif] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    await drawLetterhead(ctx, width, height, empresaData, empresaNotif);
    await drawFooterBar(ctx, width, height, empresaData, empresaNotif);

    // ========================================
    // CIUDAD Y FECHA (arriba a la DERECHA)
    // ========================================`;

if (code.includes(oldNotif_header)) {
  code = code.replace(oldNotif_header, newNotif_header);
  console.log('✅ generarNotificacionVacaciones: header actualizado');
} else {
  console.warn('⚠️ generarNotificacionVacaciones: header anchor no encontrado');
}

// Reemplazar footer de NotificacionVacaciones (con emoji de texto)
const oldNotif_footer = `    // ========================================
    // FOOTER CON DATOS DE CONTACTO
    // ========================================
    const footerY = height - 120;
    ctx.font = "38px Arial";
    ctx.textAlign = "center";
    
    if (usuario.empresa === "AP") {
      ctx.fillText("📍 Pereira, Risaralda - Colombia     ☎ (+57) 324 234 1917     ✉ andrespublicidadtg@gmail.com", width / 2, footerY);
    }

    // Enviar como PDF usando helper`;

const newNotif_footer = `    // Enviar como PDF usando helper`;

if (code.includes(oldNotif_footer)) {
  code = code.replace(oldNotif_footer, newNotif_footer);
  console.log('✅ generarNotificacionVacaciones: old footer removed');
}

// ========================
// PASO 8: Actualizar generarCertificadoDiaFamilia
// ========================
const oldDiaFamilia_header = `    // Determinar empresa
    let empresaData: any = {};
    if (usuario.empresa === "ME") {
      empresaData = {
        nombre: "MARIA EVANGELINA AGUDELO GIL",
        nit: "CC. 42094435",
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
    // LOGO EN LA PARTE SUPERIOR
    // ========================================
    const logoPath = path.join(__dirname, "../../public", empresaData.logo);
    if (fs.existsSync(logoPath)) {
      try {
        const logo = await loadImage(logoPath);
        let logoWidth = 400;
        let logoY = 120;
        
        const logoHeight = (logo.height / logo.width) * logoWidth;
        const logoX = (width - logoWidth) / 2;
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } catch (logoError) {
        console.error("Error al cargar logo:", logoError);
      }
    }

    // ========================================
    // MARCA DE AGUA
    // ========================================
    if (fs.existsSync(logoPath)) {
      try {
        ctx.save();
        ctx.globalAlpha = 0.05;
        
        const logo = await loadImage(logoPath);
        const watermarkSize = 1800;
        const watermarkHeight = (logo.height / logo.width) * watermarkSize;
        const watermarkX = (width - watermarkSize) / 2;
        const watermarkY = (height - watermarkHeight) / 2;

        ctx.drawImage(logo, watermarkX, watermarkY, watermarkSize, watermarkHeight);
        ctx.restore();
      } catch (err) {
        console.error("Error al agregar marca de agua:", err);
      }
    }

    // ========================================
    // TÍTULO
    // ========================================`;

const newDiaFamilia_header = `    // Determinar empresa (usando datos globales)
    const empresaDiaFamilia = (usuario.empresa as string) || 'AP';
    const empresaData = { ...empresasData[empresaDiaFamilia] };

    // ========================================
    // MEMBRETE: fondo + stripe + watermark + logo
    // ========================================
    await drawLetterhead(ctx, width, height, empresaData, empresaDiaFamilia);
    await drawFooterBar(ctx, width, height, empresaData, empresaDiaFamilia);

    // ========================================
    // TÍTULO
    // ========================================`;

if (code.includes(oldDiaFamilia_header)) {
  code = code.replace(oldDiaFamilia_header, newDiaFamilia_header);
  console.log('✅ generarCertificadoDiaFamilia: header actualizado');
} else {
  console.warn('⚠️ generarCertificadoDiaFamilia: header anchor no encontrado');
}

// ========================
// PASO 9: Guardar el archivo
// ========================
// Restaurar CRLF si el original lo tenía
if (hasCRLF) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, code, 'utf8');
console.log('\n✅ Archivo actualizado exitosamente!');
console.log('Líneas totales:', code.split('\n').length);
