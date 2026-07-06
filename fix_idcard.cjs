const fs = require('fs');
let code = fs.readFileSync('components/IdCardView.tsx', 'utf8');
code = code.replace('// @ts-expect-error - html2canvas missing types\n', '');
fs.writeFileSync('components/IdCardView.tsx', code);
