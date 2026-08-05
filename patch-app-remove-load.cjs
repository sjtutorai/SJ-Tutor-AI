const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /\/\/ Revalidate \/ Sync from Firestore in the background[\s\S]*?loadProfileFromDb\(\);\n/m;
code = code.replace(regex, '');
fs.writeFileSync('App.tsx', code);
