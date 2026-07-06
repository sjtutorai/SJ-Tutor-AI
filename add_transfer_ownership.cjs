const fs = require('fs');
let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

const dangerZone = `              {isOwner && (
                <button 
                  onClick={() => {
                    const newOwner = prompt("Enter the email of the member to transfer ownership to:");
                    if(newOwner) {
                       // Find the member by email... For simplicity in MVP, we can just use UID if we had it, but let's just use email.
                       alert("Transfer ownership requires user email verification. Please ensure they are an admin first.");
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-5 h-5" />
                    Transfer Ownership
                  </span>
                </button>
              )}
              
              {isOwner && (
                <button 
                  onClick={handleDeleteGroup}`;

code = code.replace(/              \{isOwner && \(\n                <button \n                  onClick=\{handleDeleteGroup\}/, dangerZone);

fs.writeFileSync('components/GroupsView.tsx', code);
