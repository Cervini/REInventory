import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import toast from 'react-hot-toast';

export default function Auth({ onShowPolicy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.email.split('@')[0], // Use email prefix as default name
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      // This block runs whether the signup succeeds or fails
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The user is now signed in.
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false); // Re-enable buttons
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="bg-surface shadow-lg shadow-accent/10 rounded-lg px-8 pt-6 pb-8 mb-4 border border-accent/20">
        <h2 className="text-3xl text-center font-bold mb-6 text-accent font-fantasy">
          Join the Guild
        </h2>
        <div className="mb-4">
          <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base leading-tight focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base leading-tight focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            id="password"
            type="password"
            placeholder="******************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors duration-200"
            type="button"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? '...' : 'Sign Up'}
          </button>
          <button
            className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors duration-200"
            type="button"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? '...' : 'Sign In'}
          </button>
        </div>
      </div>
      <p className="text-center text-text-muted text-xs mt-4">
        By signing up, you agree to our 
        <button onClick={onShowPolicy} className="font-bold text-accent hover:underline ml-1">
          Privacy Policy
        </button>.
      </p>
    </div>
  );
}