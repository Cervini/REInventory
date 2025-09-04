import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Login from './Login';
import SignUp from './SignUp';

/**
 * Checks if a user profile document exists in Firestore for a given user.
 * If the profile does not exist, it creates a new one with default settings
 * and a default display name.
 * @param {object} user - The Firebase Authentication user object, obtained after sign-in.
 * @returns {Promise<void>} A promise that resolves once the check and potential creation are complete.
 */
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

/**
 * A component that handles the user authentication flow. It conditionally renders
 * either a Login or a Sign-Up form and provides the logic for switching between
 * them and for handling Google sign-in.
 * @param {object} props - The component props.
 * @param {Function} props.onShowPolicy - A callback function to show a policy document.
 * @returns {JSX.Element} The Login or SignUp component, based on the current state.
 */
export default function Auth({ onShowPolicy }) {
  const [showLogin, setShowLogin] = useState(true);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
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