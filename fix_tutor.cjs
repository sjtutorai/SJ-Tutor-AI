const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');

code = code.replace(
  `      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages.map((m, i) => ({`,
  `      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages.map((m: any, i) => ({`
);

code = code.replace(
  `      if (!isGeneratingRef.current) {
        setMessages(initialMessages.map((m, i) => ({`,
  `      if (!isGeneratingRef.current) {
        setMessages(initialMessages.map((m: any, i) => ({`
);

fs.writeFileSync('components/TutorChat.tsx', code);
