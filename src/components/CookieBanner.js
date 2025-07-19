import React, { useState, useEffect } from 'react';

export default function CookieBanner({ onShowPolicy }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-accent/20 p-4 z-50 flex flex-col sm:flex-row items-center justify-center text-center sm:space-x-4">
      <p className="text-sm text-text-muted mb-2 sm:mb-0">
        We use essential local storage to manage your login session. 
        <button onClick={onShowPolicy} className="font-bold text-accent hover:underline ml-1">
          Learn More
        </button>.
      </p>
      <button 
        onClick={handleAccept}
        className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200 flex-shrink-0"
      >
        Okay, I understand
      </button>
    </div>
  );
}