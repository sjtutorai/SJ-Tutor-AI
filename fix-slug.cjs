const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes('export const sanitizeSlug = (str: string)')) {
  code = code.replace(
    'export const INITIAL_FORM_DATA',
    'export const sanitizeSlug = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "general";\nexport const INITIAL_FORM_DATA'
  );
}
// remove local sanitizeSlug
code = code.replace(/const sanitizeSlug = \(str: string\) => [^;]+;\n/g, '');

fs.writeFileSync('App.tsx', code);
