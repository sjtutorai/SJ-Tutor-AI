const fs = require('fs');
let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

code = code.replace(
  `import { formatLaTeXToUnicode } from '../utils/exportUtils';`,
  `import { formatLaTeXToUnicode } from '../utils/exportUtils';\nimport { useNotifications } from './NotificationContext';`
);

code = code.replace(
  `  const [showExportModal, setShowExportModal] = useState(false);`,
  `  const [showExportModal, setShowExportModal] = useState(false);\n  const { sendNotification } = useNotifications();`
);

code = code.replace(
  `        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);`,
  `        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        if (userId) {
          sendNotification('Notes Summarized', \`New note '\${newNote.title}' was successfully generated.\`, 'Features', userId);
        }`
);

fs.writeFileSync('components/NotesView.tsx', code);
