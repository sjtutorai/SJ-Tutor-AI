const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

// Change viewMode initial and types
code = code.replace(
  `const [viewMode, setViewMode] = useState<'SUBJECTS' | 'LIST' | 'EDITOR' | 'AI_GENERATOR'>('SUBJECTS');`,
  `const [viewMode, setViewMode] = useState<'FOLDERS' | 'LIST' | 'EDITOR' | 'AI_GENERATOR'>('FOLDERS');`
);
code = code.replace(
  "const [selectedSubject, setSelectedSubject] = useState<string | null>(null);",
  "const [selectedFolder, setSelectedFolder] = useState<string | null>(null);\n  const [selectedTag, setSelectedTag] = useState<string | null>(null);"
);

code = code.replace(
  "const subjects = Array.from(new Set(notes.map(n => n.subject)));",
  "const folders = Array.from(new Set(notes.map(n => n.folder || 'Uncategorized')));\n  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));"
);

code = code.replace(
  "const filteredNotes = notes.filter(n => {",
  `const filteredNotes = notes.filter(n => {
    const matchesFolder = !selectedFolder || (n.folder || 'Uncategorized') === selectedFolder;
    const matchesTag = !selectedTag || (n.tags || []).includes(selectedTag);`
);

code = code.replace(
  "const matchesSubject = !selectedSubject || n.subject === selectedSubject;",
  "// replaced above"
);

code = code.replace(
  "return matchesSubject && matchesSearch;",
  "return matchesFolder && matchesTag && matchesSearch;"
);

// Tab Nav
code = code.replace(
  `onClick={() => setViewMode('SUBJECTS')}`,
  `onClick={() => setViewMode('FOLDERS')}`
);
code = code.replace(
  `viewMode === 'SUBJECTS' ?`,
  `viewMode === 'FOLDERS' ?`
);
code = code.replace(
  `Subjects`,
  `Folders`
); // Note: might match multiple, we will replace specific

fs.writeFileSync('components/NotesView.tsx', code);
