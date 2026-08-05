const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

const regex = /export interface HistoryItem {([\s\S]*?)  id\?: string;\n  suggestions\?: string\[\];\n([\s\S]*?)}/m;
code = code.replace(regex, 'export interface HistoryItem {$1$2}');
fs.writeFileSync('types.ts', code);
