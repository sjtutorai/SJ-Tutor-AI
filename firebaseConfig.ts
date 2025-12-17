import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD787Kvl1YH87mnG5iH_XcYl-X6ZjFm8jU",
  authDomain: "study-verse-ai.firebaseapp.com",
  projectId: "study-verse-ai",
  storageBucket: "study-verse-ai.firebasestorage.app",
  messagingSenderId: "918183555502",
  appId: "1:918183555502:web:3fc55b0904fa6c09b4183f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);