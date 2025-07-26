import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className="bg-surface shadow-lg shadow-accent/10 rounded-lg px-8 pt-6 pb-8 mb-4 border border-accent/20">
      <h2 className="text-3xl text-center font-bold mb-6 text-accent font-fantasy">
        Login
      </h2>
      <div className="mb-4">
        <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="login-email">
          Email
        </label>
        <input
          className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base leading-tight focus:outline-none focus:ring-2 focus:ring-accent"
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="mb-6">
        <label className="block text-text-muted text-sm font-bold mb-2" htmlFor="login-password">
          Password
        </label>
        <input
          className="shadow-inner appearance-none border border-background/50 rounded w-full py-2 px-3 bg-background text-text-base leading-tight focus:outline-none focus:ring-2 focus:ring-accent"
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex items-center justify-center">
        <button
          className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 w-full"
          type="button"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? '...' : 'Sign In'}
        </button>
      </div>
      <p className="text-center text-text-muted text-xs mt-4">
        Don't have an account? 
        <button onClick={onSwitchToSignUp} className="font-bold text-accent hover:underline ml-1">
          Sign Up
        </button>
      </p>
    </div>
  );
}