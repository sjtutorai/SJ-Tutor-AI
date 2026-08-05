const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

const target = `<div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Folder className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>`;
const replacement = `<div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Folder className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
                {allTags.length > 0 && (
                  <select 
                    value={selectedTag || ''}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}
`;
code = code.replace(target, replacement);
fs.writeFileSync('components/NotesView.tsx', code);
