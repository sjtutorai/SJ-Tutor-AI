const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/html = html\.replace\('<title>SJ Tutor AI - Your AI Study Buddy<\/title>', metaTags\);/, "html = html.replace('<title>SJ Tutor AI - All-in-One AI Study Companion</title>', metaTags);");

fs.writeFileSync('server.ts', code);
console.log('server.ts updated');
