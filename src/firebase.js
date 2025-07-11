// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRDbSpelwRn4IxIwgSPZq_CEgfSnfDaj8",
  authDomain: "reinventory-94505.firebaseapp.com",
  projectId: "reinventory-94505",
  storageBucket: "reinventory-94505.firebasestorage.app",
  messagingSenderId: "226752516033",
  appId: "1:226752516033:web:fb6aae2ea265a8cc9c2940",
  measurementId: "G-EMZ1CKHEXD"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Get a reference to the Firestore database service
export const db = getFirestore(app);