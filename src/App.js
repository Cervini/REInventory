import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Tooltip } from 'react-tooltip';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import './App.css';

// Import all components
import InventoryGrid from './components/InventoryGrid';
import Auth from './components/Auth';
import CampaignSelector from './components/CampaignSelector';
import ProfileSettings from './components/ProfileSettings';
import CookieBanner from './components/CookieBanner';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // State to manage which "page" is visible
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'privacy', 'cookies'

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setCampaignId(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        }
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    });
  };

  const handleBackToCampaigns = () => {
    setCampaignId(null);
  };

  // This function now acts as our simple "router"
  const renderContent = () => {
    if (currentPage === 'privacy') {
      return <PrivacyPolicy onClose={() => setCurrentPage('main')} />;
    }
    if (currentPage === 'cookies') {
      return <CookiePolicy onClose={() => setCurrentPage('main')} />;
    }

    // Standard application flow
    if (loading && !user) {
      return <div>Loading...</div>;
    }
    if (!user) {
      return <Auth onShowPolicy={() => setCurrentPage('privacy')} />;
    }
    if (user && !campaignId) {
      return <CampaignSelector onCampaignSelected={setCampaignId} />;
    }
    if (user && campaignId) {
      return <InventoryGrid campaignId={campaignId} user={user} userProfile={userProfile} />;
    }
  };

  return (
    <main className="text-text-base h-screen flex flex-col items-center p-4 font-sans">
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
      <Tooltip id="item-tooltip" style={{ zIndex: 99, maxWidth: '300px' }} openOnClick={true} />
      {showSettings && (
        <ProfileSettings 
          user={user}
          userProfile={userProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="w-full max-w-4xl flex flex-col flex-grow">
        {/* The header is now only visible on the main page */}
        {currentPage === 'main' && (
           <div className="flex justify-between items-center w-full mb-4">
              
              {/* Left Slot */}
              <div className="flex items-center space-x-2">
                {campaignId && (
                  <button onClick={handleBackToCampaigns} className="p-2 rounded-full hover:bg-surface transition-colors duration-200" aria-label="Back to campaigns">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                )}
                {campaignId && (
                  <div className="relative">
                    <button onClick={() => setIsCodeVisible(prev => !prev)} className="p-2 rounded-full hover:bg-surface transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    </button>
                    {isCodeVisible && (
                      <div className="absolute left-0 mt-2 w-auto bg-gradient-to-b from-surface to-background rounded-md shadow-lg p-2 z-50 border border-accent/20"
                        onMouseLeave={() => setIsCodeVisible(false)}>
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
              <div className="flex-grow text-center">
                <h1 className="text-2xl sm:text-4xl font-bold font-fantasy"><span className="text-accent">RE</span>Inventory</h1>
              </div>

              {/* Right Slot */}
              <div>
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        )}
        
        {renderContent()}
      </div>

      <CookieBanner onShowPolicy={() => setCurrentPage('cookies')} />
    </main>
  );
}