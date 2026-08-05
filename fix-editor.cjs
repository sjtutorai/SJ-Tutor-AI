const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

const targetStatus = `                       Status:
                        <select`;

const tagsEditor = `                       Folder:
                       <input 
                         type="text" 
                         value={editingNote.folder || ''}
                         onChange={(e) => setEditingNote({...editingNote, folder: e.target.value})}
                         className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-800 dark:text-white outline-none focus:ring-1 ring-primary-500 w-24"
                         placeholder="Folder name"
                       />
                    </div>
                    <div className="flex items-center gap-2">
                       Tags:
                       <input 
                         type="text"
                         value={(editingNote.tags || []).join(', ')}
                         onChange={(e) => setEditingNote({...editingNote, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                         className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-800 dark:text-white outline-none focus:ring-1 ring-primary-500 w-32"
                         placeholder="tag1, tag2"
                       />
                    </div>
                    <div className="flex items-center gap-2">
                       Status:
                        <select`;
code = code.replace(targetStatus, tagsEditor);
fs.writeFileSync('components/NotesView.tsx', code);
