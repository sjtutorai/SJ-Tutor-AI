
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApvrjOz196Z3feFfkW6y3W7r4OQiM6oIY",
  authDomain: "sj-tutorai.firebaseapp.com",
  projectId: "sj-tutorai",
  storageBucket: "sj-tutorai.firebasestorage.app",
  messagingSenderId: "215292591396",
  appId: "1:215292591396:web:8a3ccdf84585651e4c47b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
