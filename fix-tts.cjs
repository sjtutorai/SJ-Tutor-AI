const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');

const ttsButtonReplacement = `<button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}`;
const ttsButtonNew = `
                            <button
                              onClick={() => toggleSpeech(msg.id, msg.text)}
                              className={\`p-1.5 rounded-lg transition-colors \${speakingMessageId === msg.id ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}\`}
                              title={speakingMessageId === msg.id ? "Stop Speaking" : "Read Aloud"}
                            >
                              {speakingMessageId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}`;

code = code.replace(ttsButtonReplacement, ttsButtonNew);
fs.writeFileSync('components/TutorChat.tsx', code);
