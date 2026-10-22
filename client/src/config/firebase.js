// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "[REDACTED_FIREBASE_API_KEY]",
  authDomain: "[REDACTED_FIREBASE_AUTH_DOMAIN]",
  projectId: "[REDACTED_FIREBASE_PROJECT_ID]",
  storageBucket: "[REDACTED_FIREBASE_STORAGE_BUCKET]",
  messagingSenderId: "[REDACTED_FIREBASE_MESSAGING_SENDER_ID]",
  appId: "[REDACTED_FIREBASE_APP_ID]"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

