const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

code = code.replace(/selectedSubject/g, 'selectedFolder');
code = code.replace(/setSelectedSubject/g, 'setSelectedFolder');
code = code.replace(/'SUBJECTS'/g, "'FOLDERS'");

fs.writeFileSync('components/NotesView.tsx', code);
