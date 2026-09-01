const fs = require('fs');
let code = fs.readFileSync('components/NotificationsView.tsx', 'utf-8');

// Remove Admin Broadcaster states
code = code.replace(/  \/\/ Navigation tabs[\s\S]*?const \[activeTab, setActiveTab\] = useState<'inbox' \| 'admin'>\('inbox'\);/, '');
code = code.replace(/  \/\/ Admin Broadcast Form State[\s\S]*?const \[sendErrorMsg, setSendErrorMsg\] = useState\(''\);/, '');
code = code.replace(/  \/\/ Admin Real-time Databases[\s\S]*?const \[scheds, setScheds\] = useState<SchedItem\[\]>\(\[\]\);/, '');

// Remove useEffect
code = code.replace(/  \/\/ Fetch admin logs and scheduled lists in real-time[\s\S]*?\}, \[isAdminUser\]\);/, '');

// Remove handler functions
code = code.replace(/  \/\/ Dispatch scheduled broadcast immediately[\s\S]*?\}\n  \};/, '');
code = code.replace(/  \/\/ Cancel scheduled broadcast[\s\S]*?\}\n  \};/, '');
code = code.replace(/  \/\/ Retry failed delivery log[\s\S]*?\}\n  \};/, '');
code = code.replace(/  \/\/ Submit Broadcast Form[\s\S]*?\}\n  \};/, '');

// Remove Tab Selection UI
code = code.replace(/        \{\/\* Tab Selection \*\/\}(.|\n)*?        \)\}/g, '');

// Clean up {activeTab === 'inbox' ? ( ... ) : ( ... )}
code = code.replace(/      \{\/\* Render Main Tab Views \*\/\}\n      <AnimatePresence mode="wait">\n        \{activeTab === 'inbox' \? \(/, '      {/* Render Main Tab Views */}\n      <AnimatePresence mode="wait">');

// Remove the admin tab UI and the closing braces of the ternary
let parts = code.split('        ) : (');
if (parts.length > 1) {
  let firstPart = parts[0];
  let rest = parts[1];
  let endOfAdminIndex = rest.lastIndexOf('</motion.div>');
  if (endOfAdminIndex !== -1) {
    let afterAdmin = rest.substring(endOfAdminIndex + '</motion.div>'.length);
    // afterAdmin starts with \n        )\}\n      </AnimatePresence>
    afterAdmin = afterAdmin.replace(/^\s*\)\}/, '');
    code = firstPart + '\n' + afterAdmin;
  }
}

// Remove imports related to admin logs (LogItem, SchedItem, etc)
code = code.replace(/interface LogItem \{[\s\S]*?\n\}/, '');
code = code.replace(/interface SchedItem \{[\s\S]*?\n\}/, '');

// Remove {permissionStatus !== 'granted' && activeTab === 'inbox' && (
code = code.replace(/\{permissionStatus !== 'granted' && activeTab === 'inbox' && \(/, '{permissionStatus !== \'granted\' && (');

fs.writeFileSync('components/NotificationsView.tsx', code);
console.log('NotificationsView.tsx cleaned');
