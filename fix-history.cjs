const history = [
  { role: 'user', parts: [{text: '1'}] },
  { role: 'user', parts: [{text: '2'}] },
  { role: 'model', parts: [{text: '3'}] },
  { role: 'model', parts: [{text: '4'}] },
  { role: 'user', parts: [{text: '5'}] }
];

const formattedHistory = [];
for (const msg of history) {
  const last = formattedHistory[formattedHistory.length - 1];
  if (last && last.role === msg.role) {
    last.parts.push(...msg.parts);
  } else {
    formattedHistory.push({ role: msg.role, parts: [...msg.parts] });
  }
}
console.log(JSON.stringify(formattedHistory, null, 2));
