import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ onSwitchToSignUp, onGoogleSignIn }) {
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

        {/* Add this new section for social logins */}
      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-surface/50"></div>
        <span className="flex-shrink mx-4 text-text-muted text-xs">OR</span>
        <div className="flex-grow border-t border-surface/50"></div>
      </div>
      <div className="space-y-2">
        <button onClick={onGoogleSignIn} className="w-full py-2 px-4 border border-surface/50 rounded-md flex items-center justify-center space-x-2 hover:bg-surface/80 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.021,44,30.019,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg> 
          <span className="text-sm font-bold text-text-muted">Sign In with Google</span>
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