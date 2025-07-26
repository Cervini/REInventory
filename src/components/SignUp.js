import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function SignUp({ onSwitchToLogin, onShowPolicy }) {
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
        displayName: user.email.split('@')[0],
        gridWidth: 30,
        gridHeight: 10,
        createdAt: serverTimestamp(),
      });
      toast.success("Account created successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface shadow-lg shadow-accent/10 rounded-lg px-8 pt-6 pb-8 mb-4 border border-accent/20">
      <h2 className="text-3xl text-center font-bold mb-6 text-accent font-fantasy">
        Create Account
      </h2>
      <div className="mb-4">
        <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="signup-email">
          Email
        </label>
        <input
          className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base"
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mb-6">
        <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="signup-password">
          Password
        </label>
        <input
          className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base"
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-center">
        <button
          className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded w-full"
          type="button"
          onClick={handleSignUp}
          disabled={loading}
        >
          {loading ? '...' : 'Sign Up'}
        </button>
      </div>
       <p className="text-center text-text-muted text-xs mt-4">
        By signing up, you agree to our 
        <button onClick={onShowPolicy} className="font-bold text-accent hover:underline ml-1">
          Privacy Policy
        </button>.
      </p>
      <p className="text-center text-text-muted text-xs mt-4">
        Already have an account? 
        <button onClick={onSwitchToLogin} className="font-bold text-accent hover:underline ml-1">
          Login
        </button>
      </p>
    </div>
  );
}