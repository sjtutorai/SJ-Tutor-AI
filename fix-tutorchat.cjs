const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');

// First, find the `chatWithTutorStream` call
const targetCall = 'const stream = await GeminiService.chatWithTutorStream(textToSend, activeHistory, imgDataList, activeFiles);';

// We need to build the `userContext` string right before this.
// We have access to `fullHistory` from the props.
const contextBuilder = `
      let userContext = "";
      if (fullHistory && fullHistory.length > 0) {
        userContext = fullHistory.slice(0, 10).map((h: any) => {
          let summary = \`- \${new Date(h.timestamp).toLocaleDateString()}: \${h.title} (\${h.type})\`;
          if (h.type === 'Tutor Chat' && h.content?.messages) {
             const msgs = h.content.messages.filter((m: any) => m.text && typeof m.text === 'string');
             if (msgs.length > 0) {
                const userMsg = msgs.find((m: any) => m.role === 'user');
                if (userMsg) summary += \` | Query: \${userMsg.text.substring(0, 100)}\`;
             }
          }
          return summary;
        }).join("\\n");
      }
      
      const stream = await GeminiService.chatWithTutorStream(textToSend, activeHistory, imgDataList, activeFiles, userContext);
`;

code = code.replace(targetCall, contextBuilder);

fs.writeFileSync('components/TutorChat.tsx', code);
