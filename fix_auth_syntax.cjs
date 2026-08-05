const fs = require('fs');

let authFile = fs.readFileSync('components/Auth.tsx', 'utf8');

authFile = authFile.replace(/\{authMode !== "reset" && \(\n              <div className="space-y-1\.5">\n              <label className="text-xs font-bold text-slate-600 ml-1">Password<\/label>/g, 
`<div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">Password</label>`);
              
authFile = authFile.replace(/className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"\n                \/>\n              <\/div>\n            <\/div>\n            \)\}/g,
`className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"
                />
              </div>
            </div>`);

// Check if {message && ...} is still there
authFile = authFile.replace(/\{message && \(\n              <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 flex items-start gap-2">\n                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0\.5" \/>\n                \{message\}\n              <\/div>\n            \)\}/g, '');

fs.writeFileSync('components/Auth.tsx', authFile);
