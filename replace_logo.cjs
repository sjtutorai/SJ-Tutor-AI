const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        replaceInDir(fullPath);
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        content = content.replace(/https:\/\/i\.ibb\.co\/qFknfdny\/IMG-20260810-WA0018\.jpg/g, 'https://sjtutor.ai/logo.png');
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content);
          console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

replaceInDir(__dirname);
