const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /const handleSignUpSuccess = async[^]+?setShowAuthModal\(false\);\n    setMode\(AppMode.PROFILE\);\n  };/g;

const replacement = `const handleSignUpSuccess = async (initialData?: Partial<UserProfile>) => {
    setShowAuthModal(false);
  };`;
  
code = code.replace(regex, replacement);
fs.writeFileSync('App.tsx', code);
