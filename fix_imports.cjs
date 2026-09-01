const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// Fix the import
content = content.replace(/import \{ doc, getDoc \} from "firebase\/firestore";/, 'import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";');

// Fix the require inside the effect
content = content.replace(/const \{ doc, onSnapshot, setDoc \} = require\('firebase\/firestore'\);\n      const \{ db \} = require\('\.\/firebaseConfig'\);/g, '');

fs.writeFileSync('App.tsx', content);
console.log("Updated App.tsx");
