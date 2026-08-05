const fs = require('fs');
let code = fs.readFileSync('components/Auth.tsx', 'utf8');

// replace imports
code = code.replace(
  "createUserWithEmailAndPassword,",
  "createUserWithEmailAndPassword,\n  updateProfile,"
);

// replace usage
code = code.replace(
  "const result = await createUserWithEmailAndPassword(auth, email, password);\n        if (onSignUpSuccess) {",
  "const result = await createUserWithEmailAndPassword(auth, email, password);\n        await updateProfile(result.user, { displayName: displayName.trim() });\n        if (onSignUpSuccess) {"
);

fs.writeFileSync('components/Auth.tsx', code);
