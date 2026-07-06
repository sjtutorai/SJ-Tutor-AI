const fs = require('fs');

let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

// Update memberCount safely with increment if possible, or just ignore for now since it's just a number.
// Wait, we can use increment from firestore
code = code.replace(/import \{ (.*?) \} from 'firebase\/firestore';/, "import { $1, increment } from 'firebase/firestore';");

code = code.replace(/members: arrayUnion\(user.uid\)/, "members: arrayUnion(user.uid),\n        memberCount: increment(1)");

fs.writeFileSync('components/GroupsView.tsx', code);
