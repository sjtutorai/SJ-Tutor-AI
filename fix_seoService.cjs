const fs = require('fs');
let code = fs.readFileSync('services/seoService.ts', 'utf-8');

code = code.replace(/export const DEFAULT_OG_IMAGE = '[^']+';/, "export const DEFAULT_OG_IMAGE = 'https://sjtutor.ai/logo.png';");
code = code.replace(/export const DEFAULT_FAVICON_URL = '[^']+';/, "export const DEFAULT_FAVICON_URL = 'https://sjtutor.ai/logo.png';");
code = code.replace(/export const DEFAULT_TITLE = '[^']+';/, "export const DEFAULT_TITLE = 'SJ Tutor AI - All-in-One AI Study Companion';");
code = code.replace(/export const DEFAULT_DESCRIPTION = '[^']+';/, "export const DEFAULT_DESCRIPTION = 'SJ Tutor AI is an all-in-one AI study companion that generates summaries, practice quizzes, homework solutions, and provides real-time scan-to-solve AI tutoring.';");

// Update JSON-LD structure in updateStructuredData
code = code.replace(/"logo": \{[\s\S]*?"caption": "SJ Tutor AI Logo"\s*\}/m, '"logo": DEFAULT_LOGO_URL,\n          "sameAs": [\n            "https://sjtutor.ai/"\n          ]');
// Add WebPage
code = code.replace(/      \{\n        "@type": "EducationalApplication",/, '      {\n        "@type": "WebPage",\n        "@id": `${canonicalUrl}#webpage`,\n        "url": canonicalUrl,\n        "name": title || "SJ Tutor AI - All-in-One AI Study Companion",\n        "isPartOf": {\n          "@id": `${CANONICAL_BASE_URL}/#website`\n        },\n        "about": {\n          "@id": `${CANONICAL_BASE_URL}/#organization`\n        },\n        "description": description || DEFAULT_DESCRIPTION\n      },\n      {\n        "@type": "EducationalApplication",');

fs.writeFileSync('services/seoService.ts', code);
console.log('seoService.ts updated');
