import React, { useState } from 'react';
import Login from './Login';
import SignUp from './SignUp';

export default function Auth({ onShowPolicy }) {
  const [showLogin, setShowLogin] = useState(true);

  if (showLogin) {
    return (
      <div className="w-full max-w-xs mx-auto">
        <Login onSwitchToSignUp={() => setShowLogin(false)} />
      </div>
    );
  } else {
    return (
      <div className="w-full max-w-xs mx-auto">
        <SignUp onSwitchToLogin={() => setShowLogin(true)} onShowPolicy={onShowPolicy} />
      </div>
    );
  }
}