import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Tooltip } from 'react-tooltip';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import './App.css';

// Component imports
import InventoryGrid from './components/InventoryGrid';
import Auth from './components/Auth';
import CampaignSelector from './components/CampaignSelector';
import ProfileSettings from './components/ProfileSettings';
import CookieBanner from './components/CookieBanner';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';
import Compendium from './components/Compendium';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'privacy', 'cookies', 'compendium'
  const [hasCookieConsent, setHasCookieConsent] = useState(() => !!localStorage.getItem('cookieConsent'));
  
  const codeCloseTimer = useRef(null);
  
  /**
   * Monitor when the user logs in or logs out and set the related states accordingly
   */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setCampaignId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth(); // cleanup function
  }, []);

  /**
   * Listens for real-time updates to the user's profile document in Firestore
   * and updates the userProfile state accordingly.
   */
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        }
        setLoading(false);
      });
      // Clean up the Firestore listener when the component unmounts or the user changes.
      return () => unsubscribeProfile();
    }
  }, [user]);

  /**
   * Copies the current campaign ID to the clipboard and displays a confirmation state for 2 seconds.
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // 2000 ms
    });
  };

  /**
   * Sets current campaing to null moving the user back to the campaign selection page.
   */
  const handleBackToCampaigns = () => {
    setCampaignId(null);
  };

  /**
   * Delays hiding the code for 1s on mouse leave to improve UX by giving the user a grace period.
   */
  const handleCodeMouseLeave = () => {
    codeCloseTimer.current = setTimeout(() => {
        setIsCodeVisible(false);
    }, 1000); // 1000 ms
  };

  /**
   * Saves the user consent of the cookie policy in local storage to show
   * the cookie banner only if the user hasn't consented
   */
  const handleCookieConsent = () => {
    localStorage.setItem('cookieConsent', 'true');
    setHasCookieConsent(true);
  };

  /**
   * Determines which main component to render based on the application's
   * current state (loading, auth, consent, and selected campaign).
   * @returns {JSX.Element} The React component to be displayed.
   */
  const renderContent = () => {
    // These pages are always accessible, as they are for informational purposes.
    if (currentPage === 'privacy') {
      return <PrivacyPolicy onClose={() => setCurrentPage('main')} />;
    }
    if (currentPage === 'cookies') {
      return <CookiePolicy onClose={() => setCurrentPage('main')} />;
    }

    // Handle the initial loading state.S
    if (loading) {
      return <div>Loading...</div>;
    }

    // If there is no user, show the login/signup form.
    if (!user) {
      return <Auth onShowPolicy={() => setCurrentPage('privacy')} />;
    }

    // --- Consent Check ---
    // If we have a user, but they haven't consented, show the consent message.
    if (!hasCookieConsent) {
      return (
        <div className="text-center text-text-muted mt-16 p-4">
          <h2 className="text-2xl font-bold text-text-base">
            Almost there!
          </h2>
          <p className="mt-2">
            To access your campaigns and inventories, please accept our cookie policy by clicking the "Okay, I understand" button in the banner at the bottom of the screen.
          </p>
        </div>
      );
    }

    // --- Core App Logic (Requires User AND Consent) ---
    if (currentPage === 'compendium') {
        return <Compendium onClose={() => setCurrentPage('main')} />;
    }
    
    if (campaignId) {
      return <InventoryGrid 
        campaignId={campaignId} 
        user={user} 
        userProfile={userProfile}
        isTrading={isTrading}
        setIsTrading={setIsTrading}
      />;
    } else {
      // having no current campaingId shows the CamapaignSelector component
      // therefore setting campaignId as null load the component
      return <CampaignSelector onCampaignSelected={setCampaignId} />;
    }
  };

  return (
    <main className="text-text-base h-screen flex flex-col items-center p-4 font-sans">
      
      {/* Global components (toasts, tooltips) */}
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'hsl(var(--color-surface))',
            color: 'hsl(var(--color-text-base))',
            border: '1px solid hsl(var(--color-accent) / 0.2)',
          },
        }}
      />
      <Tooltip
        id="item-tooltip"
        style={{ zIndex: 99, maxWidth: '300px' }}
        openOnClick={true}
        delayShow={200}
        clickable={true}
      />
      
      {/* Modals */}
      {showSettings && (
        <ProfileSettings 
          user={user}
          userProfile={userProfile}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="w-full max-w-4xl flex flex-col flex-grow relative overflow-hidden">
        {/* The header is now only visible on the main page */}
        {currentPage === 'main' && (
           <div className="flex justify-between items-center w-full mb-4">
              
              {/* Left Slot */}
              <div className="flex-1 flex justify-start items-center space-x-2">
                {campaignId && (
                  <button onClick={handleBackToCampaigns} className="p-2 rounded-full hover:bg-surface transition-colors duration-200" aria-label="Back to campaigns">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                )}
                {campaignId && (
                  <button onClick={() => setIsTrading(true)} className="p-2 rounded-full hover:bg-surface transition-colors" aria-label="Start Trade">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                )}
                {campaignId && (
                  <div className="relative" onMouseLeave={handleCodeMouseLeave}>
                    <button
                      className="p-2 rounded-full hover:bg-surface transition-colors duration-200"
                      onClick={() => setIsCodeVisible(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    </button>
                    {isCodeVisible && (
                      <div
                        className="absolute left-0 mt-2 w-auto bg-gradient-to-b from-surface to-background rounded-md shadow-lg p-2 z-50 border border-accent/20"
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-text-muted font-mono text-sm whitespace-nowrap">Code: <span className="font-bold text-text-base">{campaignId}</span></span>
                          <button onClick={handleCopy} className="bg-primary hover:bg-accent hover:text-background text-text-base text-xs font-bold py-1 px-3 rounded transition-colors duration-200">{isCopied ? 'Copied!' : 'Copy'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Center Slot */}
              <div className="text-center">
                <h1 className="text-2xl sm:text-4xl font-bold font-fantasy"><span className="text-accent">RE</span>Inventory</h1>
              </div>

              {/* Right Slot */}
              <div className="flex-1 flex justify-end">
                {user && (
                  <div className="relative">
                    <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-surface transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-gradient-to-b from-surface to-background rounded-md shadow-lg py-1 z-50 border border-accent/20" onMouseLeave={() => setIsUserMenuOpen(false)}>
                        <div className="px-4 py-2 text-sm text-text-muted border-b border-surface/50">Signed in as<br/><strong className="font-medium text-text-base">{userProfile?.displayName || user.email}</strong></div>
                        <button onClick={() => { setShowSettings(true); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-accent hover:text-background transition-colors duration-200">Profile</button>
                        <button onClick={() => { auth.signOut(); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-accent hover:text-background transition-colors duration-200">Sign Out</button>
                        <button 
                          onClick={() => { setCurrentPage('compendium'); setIsUserMenuOpen(false); }} 
                          className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-accent hover:text-background transition-colors duration-200"
                        >
                          Item Compendium
                        </button>
                        <div className="border-t border-surface/50 my-1" />
                        <button 
                          onClick={() => { setCurrentPage('cookies'); setIsUserMenuOpen(false); }} 
                          className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-accent hover:text-background transition-colors duration-200"
                        >
                          Cookie Policy
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        )}

        {/* Dinamically rendered page content */}
        <div className="flex-grow overflow-y-auto">
            {renderContent()}
            {!hasCookieConsent && <div className="h-24 flex-shrink-0" />}
        </div>
      </div>
      
      {/* Persistent banner */}
      <CookieBanner 
        isVisible={!hasCookieConsent} 
        onAccept={handleCookieConsent}
        onShowPolicy={() => setCurrentPage('cookies')} 
      />
    </main>
  );
}