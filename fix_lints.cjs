const fs = require('fs');

// Fix NotesView.tsx
let notesCode = fs.readFileSync('components/NotesView.tsx', 'utf8');
notesCode = notesCode.replace(/const \{ sendNotification \} = useNotifications\(\);\s*/, '');
notesCode = notesCode.replace(/import \{ useNotifications \} from '\.\/NotificationContext';\n/, '');
fs.writeFileSync('components/NotesView.tsx', notesCode);

// Fix GroupsView.tsx
let groupCode = fs.readFileSync('components/GroupsView.tsx', 'utf8');
groupCode = groupCode.replace(/const \{ sendNotification \} = useNotifications\(\);\s*/, '');
groupCode = groupCode.replace(/import \{ useNotifications \} from '\.\/NotificationContext';\n/, '');
fs.writeFileSync('components/GroupsView.tsx', groupCode);

