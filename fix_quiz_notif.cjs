const fs = require('fs');
let code = fs.readFileSync('components/QuizView.tsx', 'utf8');

if (!code.includes('useNotifications')) {
  code = code.replace(
    `import { Share2, Clock, Calendar, Search, LayoutDashboard } from 'lucide-react';`,
    `import { Share2, Clock, Calendar, Search, LayoutDashboard } from 'lucide-react';\nimport { useNotifications } from './NotificationContext';`
  );
  
  code = code.replace(
    `  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'analytics' | 'saved'>('create');`,
    `  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'analytics' | 'saved'>('create');\n  const { sendNotification } = useNotifications();`
  );

  code = code.replace(
    `      const historyItem: HistoryItem = {`,
    `      const historyItem: HistoryItem = {`
  );
  
  code = code.replace(
    `      onSaveHistory(historyItem);`,
    `      onSaveHistory(historyItem);\n      if (user) {\n        sendNotification('Quiz Generated', \`A new \${currentGrade} \${subject} quiz has been generated.\`, 'Quiz', user.uid);\n      }`
  );

  fs.writeFileSync('components/QuizView.tsx', code);
}
