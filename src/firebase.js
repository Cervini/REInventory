// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration is now read from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_AET_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

console.log("Firebase Config being used:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore database service
export const db = getFirestore(app);
export const auth = getAuth(app);