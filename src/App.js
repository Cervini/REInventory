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
      return <InventoryGrid campaignId={campaignId} user={user} />;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    });
  };

  return (
    <main className="text-white h-screen flex flex-col items-center p-4 font-sans">
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
          currentDisplayName={userProfile?.displayName}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="w-full max-w-4xl flex flex-col flex-grow">
        <div className="flex justify-between items-center w-full mb-4">
          
          {/* Left Slot: Campaign Code Popover */}
          <div className="w-1/3">
            {campaignId && (
              <div className="relative">
                <button onClick={() => setIsCodeVisible(prev => !prev)} onBlur={() => setIsCodeVisible(false)} className="p-2 rounded-full hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                </button>
                {isCodeVisible && (
                  <div className="absolute left-0 mt-2 w-auto bg-gray-600 rounded-md shadow-lg p-2 z-50">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-300 font-mono text-sm whitespace-nowrap">Code: <span className="font-bold text-white">{campaignId}</span></span>
                      <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded">{isCopied ? 'Copied!' : 'Copy'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center Slot: Title */}
          <div className="w-1/3 text-center">
            <h1 className="text-4xl font-bold"><span className="text-red-500">RE</span>Inventory</h1>
          </div>

          {/* Right Slot: User Menu */}
          <div className="w-1/3 flex justify-end">
            {user && (
              <div className="relative">
                <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50" onMouseLeave={() => setIsUserMenuOpen(false)}>
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-600">Signed in as<br/><strong className="font-medium text-white">{userProfile?.displayName || user.email}</strong></div>
                    <button onClick={() => { setShowSettings(true); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-blue-500">Profile</button>
                    <button onClick={() => { auth.signOut(); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-blue-500">Sign Out</button>
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
