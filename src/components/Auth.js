import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Login from './Login';
import SignUp from './SignUp';

// This helper function checks if a user profile exists and creates one if not.
// This is crucial for social logins where the user doesn't go through your manual sign-up form.
const checkAndCreateUserProfile = async (user) => {
  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  
  if (!docSnap.exists()) {
    await setDoc(userDocRef, {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: serverTimestamp(),
      gridWidth: 30,
      gridHeight: 10,
    });
    toast.success("Welcome! Your profile has been created.");
  }
};

export default function Auth({ onShowPolicy }) {
  const [showLogin, setShowLogin] = useState(true);

  // The logic for handling the Google Sign-In popup
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // After a successful login, check if we need to create a profile.
      await checkAndCreateUserProfile(result.user);
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  if (showLogin) {
    return (
      <div className="w-full max-w-xs mx-auto">
        <Login 
          onSwitchToSignUp={() => setShowLogin(false)} 
          onGoogleSignIn={handleGoogleSignIn}
        />
      </div>
    );
  } else {
    return (
      <div className="w-full max-w-xs mx-auto">
        <SignUp 
          onSwitchToLogin={() => setShowLogin(true)} 
          onShowPolicy={onShowPolicy}
          onGoogleSignIn={handleGoogleSignIn}
        />
      </div>
    );
  }
}