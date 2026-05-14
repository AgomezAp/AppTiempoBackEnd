const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('c:/Users/DESARROLLO/Documents/Codigos/AppTiempoBackEnd/src/controllers/certificado.ts', 'utf8');

const regexWatermark = /\/\/\s*Fondo blanco\s+ctx\.fillStyle\s*=\s*'#ffffff';\s+ctx\.fillRect\(0,\s*0,\s*width,\s*height\);([\s\S]*?)ctx\.restore\(\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*console\.error\([^)]*\);\s*\}\s*\}/g;

code = code.replace(regexWatermark, (match) => {
    return '// Fondo blanco\n' +
    '    ctx.fillStyle = \'#ffffff\';\n' +
    '    ctx.fillRect(0, 0, width, height);\n' +
    '\n' +
    '    // MARCA DE AGUA\n' +
    '    const watermarkPath = path.join(__dirname, \'../../public\', empresaData.watermark || empresaData.logo);\n' +
    '    if (fs.existsSync(watermarkPath)) {\n' +
    '      try {\n' +
    '        ctx.save();\n' +
    '        ctx.globalAlpha = 0.05;\n' +
    '        const watermarkImg = await loadImage(watermarkPath);\n' +
    '        const watermarkSize = 1000;\n' +
    '        const watermarkHeight = (watermarkImg.height / watermarkImg.width) * watermarkSize;\n' +
    '        const watermarkX = (width - watermarkSize) / 2;\n' +
    '        const watermarkY = (height - watermarkHeight) / 2;\n' +
    '        ctx.drawImage(watermarkImg, watermarkX, watermarkY, watermarkSize, watermarkHeight);\n' +
    '        ctx.restore();\n' +
    '      } catch (err) {\n' +
    '        console.error(\'Error al agregar marca de agua:\', err);\n' +
    '      }\n' +
    '    }';
});

fs.writeFileSync('c:/Users/DESARROLLO/Documents/Codigos/AppTiempoBackEnd/src/controllers/certificado.ts', code, 'utf8');
console.log('Done!');
