const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

code = code.replace(
  "{viewMode === 'SUBJECTS' && (",
  "{viewMode === 'FOLDERS' && ("
);

code = code.replace(
  "{subjects.length === 0 && (",
  "{folders.length === 0 && ("
);

code = code.replace(
  "{subjects.map(subject => {",
  "{folders.map(folder => {"
);

code = code.replace(
  "const count = notes.filter(n => n.subject === subject).length;",
  "const count = notes.filter(n => (n.folder || 'Uncategorized') === folder).length;"
);

code = code.replace(
  "key={subject}",
  "key={folder}"
);

code = code.replace(
  "onClick={() => { setSelectedSubject(subject); setViewMode('LIST'); }}",
  "onClick={() => { setSelectedFolder(folder); setViewMode('LIST'); }}"
);

code = code.replace(
  "truncate\">{subject}</h3>",
  "truncate\">{folder}</h3>"
);

// Tags UI
const searchBarRegex = /<div className="relative flex-1">.*?<\/div>/s;
const tagsUI = `
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Book className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                {allTags.length > 0 && (
                  <select 
                    value={selectedTag || ''}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}
`;

code = code.replace(searchBarRegex, tagsUI);

fs.writeFileSync('components/NotesView.tsx', code);
