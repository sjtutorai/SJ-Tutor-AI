const fs = require('fs');
let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

code = code.replace(/        memberCount: increment\(1\),\n        memberCount: \(group.memberCount \|\| 1\) \+ 1\n/, "        memberCount: increment(1)\n");

fs.writeFileSync('components/GroupsView.tsx', code);
