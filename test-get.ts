import dotenv from 'dotenv';
dotenv.config();

// mock import.meta.env
(global as any).import = { meta: { env: {
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
} } };

import { db } from "./firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";

async function run() {
  try {
    const d = await getDoc(doc(db, "sharedContent", "quiz_9th-grade_science_chemical-reactions"));
    console.log("Exists:", d.exists());
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
