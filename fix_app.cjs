const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const importSettingsPattern = /import \{ SettingsService \} from "\.\/services\/settingsService";/;
if (content.match(importSettingsPattern) && !content.includes('subscribeToUserSettings')) {
    // Just inject the effect near another useEffect
    const authEffectMatch = content.match(/  \/\/ Auth Listener\n  useEffect\(\(\) => \{/);
    if (authEffectMatch) {
       const replacement = `  // Remote Settings Listener
  useEffect(() => {
    let unsubscribeSettings;
    if (user) {
      const { doc, onSnapshot, setDoc } = require('firebase/firestore');
      const { db } = require('./firebaseConfig');
      const userSettingsRef = doc(db, "userSettings", user.uid);
      
      unsubscribeSettings = onSnapshot(userSettingsRef, (snap) => {
        if (snap.exists()) {
          SettingsService.applyRemoteSettings(snap.data());
        } else {
          const currentSettings = SettingsService.getSettings();
          setDoc(userSettingsRef, currentSettings, { merge: true }).catch(e => console.error("Error creating initial remote settings", e));
        }
      });
    }
    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [user]);

  // Auth Listener
  useEffect(() => {`;
       content = content.replace(authEffectMatch[0], replacement);
    }
}

fs.writeFileSync('App.tsx', content);
console.log("Updated App.tsx");
