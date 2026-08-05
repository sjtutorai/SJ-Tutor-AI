const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const shareStr = `onSharePublicLink={async (type, title, content) => {
                const classSlug = sanitizeSlug(formData.gradeClass || "general");
                const subjectSlug = sanitizeSlug(formData.subject || "general");
                const chapterSlug = sanitizeSlug(formData.chapterName || type.toLowerCase());                                
                const prefixMap: Record<string, string> = {
                  "Summary": "summary",
                  "Homework Solution": "homework",
                  "Notes": "notes",
                  "Interactive Quiz": "quiz",
                  "Tutor Chat": "tutor"
                };
                const mappedType = prefixMap[type] || type.toLowerCase();
                const customId = \`\${mappedType}_\${classSlug}_\${subjectSlug}_\${chapterSlug}\`;
                const customUrl = \`\${window.location.origin}/\${mappedType}/\${classSlug}/\${subjectSlug}/\${chapterSlug}\`;
                const customMessage = \`🎓 SJ Tutor AI - \${title} 🎓\\nClass: \${formData.gradeClass || "General"}\\nSubject: \${formData.subject || "General"}\\n\\nReview this study content here:\`;
                await handleSharePublicLink(type, title, content, customId, customUrl, customMessage);
              }}`;

code = code.replace(/onSharePublicLink=\{handleSharePublicLink\}/g, shareStr);

fs.writeFileSync('App.tsx', code);
