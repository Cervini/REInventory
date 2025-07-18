import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Tooltip } from 'react-tooltip';
import { Toaster } from 'react-hot-toast';
import './App.css';
import InventoryGrid from './components/InventoryGrid';
import Auth from './components/Auth';
import CampaignSelector from './components/CampaignSelector';
import ProfileSettings from './components/ProfileSettings';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false)

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
        setLoading(false); // Stop loading once we have user and profile info
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  const renderContent = () => {
    if (loading && !user) {
      return <div>Loading...</div>;
    }
    if (!user) return <Auth />;
    if (user && !campaignId) {
      return <CampaignSelector onCampaignSelected={setCampaignId} />;
    }
    if (user && campaignId) {
      return <InventoryGrid campaignId={campaignId} user={user} userProfile={userProfile} />;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    });
  };

  const handleBackToCampaigns = () => {
    setCampaignId(null);
  };

  return (
    <main className="text-text-base h-screen flex flex-col items-center p-4 font-fantasy">
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
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
        <div className="flex justify-between items-center w-full mb-4">
          
          {/* Left Slot: Campaign Code Popover */}
          <div className="flex items-center space-x-2">
            {campaignId && (
              <button onClick={handleBackToCampaigns} className="p-2 rounded-full hover:bg-background" aria-label="Back to campaigns">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            {campaignId && (
              <div className="relative">
                <button onClick={() => setIsCodeVisible(prev => !prev)} className="p-2 rounded-full hover:bg-background">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                </button>
                {isCodeVisible && (
                  <div className="absolute left-0 mt-2 w-auto bg-gray-600 rounded-md shadow-lg p-2 z-50"
                    onMouseLeave={() => setIsCodeVisible(false)}>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-300 font-mono text-sm whitespace-nowrap">Code: <span className="font-bold text-text-base">{campaignId}</span></span>
                      <button onClick={handleCopy} className="bg-blue-600 hover:bg-primary/80 text-text-base text-xs font-bold py-1 px-3 rounded">{isCopied ? 'Copied!' : 'Copy'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center Slot: Title */}
          <div className="flex-grow text-center">
            <h1 className="text-4xl font-bold"><span className="text-destructive">RE</span>Inventory</h1>
          </div>

          {/* Right Slot: User Menu */}
          <div>
            {user && (
              <div className="relative">
                <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-background">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg py-1 z-50" onMouseLeave={() => setIsUserMenuOpen(false)}>
                    <div className="px-4 py-2 text-sm text-text-muted border-b border-surface">Signed in as<br/><strong className="font-medium text-text-base">{userProfile?.displayName || user.email}</strong></div>
                    <button onClick={() => { setShowSettings(true); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-primary">Profile</button>
                    <button onClick={() => { auth.signOut(); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-base hover:bg-primary">Sign Out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
            {renderContent()}
        </div>
    </main>
  );
}
