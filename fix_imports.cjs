const fs = require('fs');
let code = fs.readFileSync('components/NotificationsView.tsx', 'utf-8');

// Remove useEffect
code = code.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState } from 'react';");

// Remove unused lucide icons
code = code.replace(/ShieldAlert, Send, Calendar, Clock, RotateCcw, AlertCircle, RefreshCw/, "");

// Remove unused firestore imports
code = code.replace(/import \{ collection, query, orderBy, onSnapshot, limit, doc, deleteDoc \} from 'firebase\/firestore';/, "");

// Remove db import
code = code.replace(/import \{ db \} from '\.\.\/firebaseConfig';/, "");

// Fix dangling commas if any in lucide-react import
code = code.replace(/,\n\} from 'lucide-react';/, "\n} from 'lucide-react';");

fs.writeFileSync('components/NotificationsView.tsx', code);
console.log('Fixed imports');
