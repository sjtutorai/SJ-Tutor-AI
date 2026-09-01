const fs = require('fs');

let content = fs.readFileSync('services/settingsService.ts', 'utf8');

// Add imports
if (!content.includes("import { auth, db }")) {
  content = content.replace("import { UserSettings, DEFAULT_SETTINGS } from '../types';", "import { UserSettings, DEFAULT_SETTINGS } from '../types';\nimport { auth, db } from '../firebaseConfig';\nimport { doc, setDoc } from 'firebase/firestore';\n\nlet isSyncingFromRemote = false;");
}

// Update saveSettings
content = content.replace(/saveSettings: \(settings: UserSettings\): void => \{\n    try \{\n      localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(settings\)\);\n    \} catch \(e\) \{\n      console\.error\("Failed to save settings", e\);\n    \}\n  \},/, `saveSettings: (settings: UserSettings): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      if (auth.currentUser && !isSyncingFromRemote) {
        const userSettingsRef = doc(db, "userSettings", auth.currentUser.uid);
        setDoc(userSettingsRef, settings, { merge: true }).catch(err => {
          console.error("Failed to sync settings to Firestore", err);
        });
      }
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },`);

// Add applyRemoteSettings
const applyRemoteSettingsCode = `  /**
   * Applies settings from Firestore without triggering an infinite upload loop.
   */
  applyRemoteSettings: (remoteSettings: any): void => {
    try {
      isSyncingFromRemote = true;
      const current = SettingsService.getSettings();
      const updated = {
        ...current,
        ...remoteSettings,
        learning: { ...current.learning, ...(remoteSettings.learning || {}) },
        aiTutor: { ...current.aiTutor, ...(remoteSettings.aiTutor || {}) },
        chat: { ...current.chat, ...(remoteSettings.chat || {}) },
        notifications: { ...current.notifications, ...(remoteSettings.notifications || {}) },
        appearance: { ...current.appearance, ...(remoteSettings.appearance || {}) },
        privacy: { ...current.privacy, ...(remoteSettings.privacy || {}) },
        calls: { ...current.calls, ...(remoteSettings.calls || {}) },
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error("Failed to apply remote settings", e);
    } finally {
      isSyncingFromRemote = false;
    }
  },`;

if (!content.includes('applyRemoteSettings:')) {
  content = content.replace("resetSettings:", `${applyRemoteSettingsCode}\n\n  resetSettings:`);
}

fs.writeFileSync('services/settingsService.ts', content);
console.log("Updated settingsService.ts");
