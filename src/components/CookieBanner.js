import React, { useState, useEffect } from 'react';

export default function CookieBanner() {
  // State to control the visibility of the banner
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check localStorage to see if the user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // If no consent is found, show the banner
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    // When the user accepts, save their choice to localStorage
    localStorage.setItem('cookieConsent', 'true');
    // Hide the banner
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-accent/20 p-4 z-50 flex items-center justify-center space-x-4 shadow-lg">
      <p className="text-sm text-text-muted">
        This website uses local storage to manage your login session and preferences. By continuing to use the site, you acknowledge this.
      </p>
      <button 
        onClick={handleAccept}
        className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200"
      >
        Okay
      </button>
    </div>
  );
}