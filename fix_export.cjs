const fs = require('fs');
let code = fs.readFileSync('utils/exportUtils.ts', 'utf8');
code = code.replace(`let html = \\\`
<!DOCTYPE html>`, `const html = \\\`
<!DOCTYPE html>`);

code = code.replace(`let text = Array.from(element.childNodes).map(node => {`, `const text = Array.from(element.childNodes).map(node => {`);

fs.writeFileSync('utils/exportUtils.ts', code);
