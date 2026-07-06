const fs = require('fs');

let code = fs.readFileSync('components/NotesView.tsx', 'utf8');

const imports = `import { doc, onSnapshot, setDoc } from 'firebase/firestore';\nimport { db } from '../firebaseConfig';`;

code = code.replace(`import { motion, AnimatePresence } from 'motion/react';`, `import { motion, AnimatePresence } from 'motion/react';\n${imports}`);

code = code.replace(
  `  // Load/Persist
  useEffect(() => {
    const key = userId || 'guest';
    const savedNotes = localStorage.getItem(\`notes_\${key}\`);
    const savedReminders = localStorage.getItem(\`reminders_\${key}\`);
    const savedTimetable = localStorage.getItem(\`timetable_\${key}\`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedTimetable) setTimetable(JSON.parse(savedTimetable));
  }, [userId]);

  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(\`notes_\${key}\`, JSON.stringify(notes));
    localStorage.setItem(\`reminders_\${key}\`, JSON.stringify(reminders));
    localStorage.setItem(\`timetable_\${key}\`, JSON.stringify(timetable));
  }, [notes, reminders, timetable, userId]);`,
  `  // Real-time Firestore Sync & Local Storage Fallback
  useEffect(() => {
    const key = userId || 'guest';
    
    // Always load from local storage immediately for fast render
    const savedNotes = localStorage.getItem(\`notes_\${key}\`);
    const savedReminders = localStorage.getItem(\`reminders_\${key}\`);
    const savedTimetable = localStorage.getItem(\`timetable_\${key}\`);
    
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedTimetable) setTimetable(JSON.parse(savedTimetable));

    if (userId) {
      // Setup real-time listener
      const docRef = doc(db, "user_data", \`notes_\${userId}\`);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notes) setNotes(data.notes);
          if (data.reminders) setReminders(data.reminders);
          if (data.timetable) setTimetable(data.timetable);
          
          localStorage.setItem(\`notes_\${key}\`, JSON.stringify(data.notes || []));
          localStorage.setItem(\`reminders_\${key}\`, JSON.stringify(data.reminders || []));
          localStorage.setItem(\`timetable_\${key}\`, JSON.stringify(data.timetable || {}));
        }
      });
      return unsub;
    }
  }, [userId]);

  // Save to Firestore and Local Storage when modified
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(\`notes_\${key}\`, JSON.stringify(notes));
    localStorage.setItem(\`reminders_\${key}\`, JSON.stringify(reminders));
    localStorage.setItem(\`timetable_\${key}\`, JSON.stringify(timetable));

    if (userId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setDoc(doc(db, "user_data", \`notes_\${userId}\`), {
          notes,
          reminders,
          timetable,
          updatedAt: Date.now()
        }, { merge: true });
      }, 1000); // Debounce saves to reduce writes
    }
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [notes, reminders, timetable, userId]);`
);

// We should also replace the manual localStorage write in handleTranscribe
code = code.replace(`        const key = userId || 'guest';
        localStorage.setItem(\`notes_\${key}\`, JSON.stringify(updatedNotes));`, ``);

fs.writeFileSync('components/NotesView.tsx', code);
