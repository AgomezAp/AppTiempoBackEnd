const fs = require('fs');
let code = fs.readFileSync('c:/Users/DESARROLLO/Documents/Codigos/AppTiempoBackEnd/src/controllers/certificado.ts', 'utf8');

// The original contact number might be something else, but we know it sits next to the email "seleccion@..." or in the footer area.
// We updated the empresasData to contain the new phone number already. But maybe there are hardcoded phone numbers in the footer.
code = code.replace(/\(57\)\s*304(?:\s|-)*[0-9]{3}(?:\s|-)*[0-9]{4}/g, '(+57) 300 392 1721');
code = code.replace(/\(?\+?57\)?\s*300(?:\s|-)*392(?:\s|-)*1721/g, '(+57) 300 392 1721');
code = code.replace(/\(?\+?57\)?\s*310(?:\s|-)*282(?:\s|-)*5834/g, '(+57) 300 392 1721');

fs.writeFileSync('c:/Users/DESARROLLO/Documents/Codigos/AppTiempoBackEnd/src/controllers/certificado.ts', code, 'utf8');
console.log('Contacts updated');
