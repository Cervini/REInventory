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
    if (loading) {
      return <div>Loading...</div>; // Or a proper spinner component
    }

    // If there's no user, show the login form
    if (!user) {
      return <Auth />;
    }

    // If there IS a user, but NO campaign is selected, show the selector
    if (user && !campaignId) {
      // We pass the setCampaignId function down as a prop
      return <CampaignSelector onCampaignSelected={setCampaignId} />;
    }

    // If there IS a user AND a campaign is selected, show the grid
    if (user && campaignId) {
      // We pass the campaignId and user object to the grid
      return <InventoryGrid campaignId={campaignId} user={user} />;
    }
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
        <div className="relative flex justify-center items-center mb-4">
          <h1 className="text-4xl font-bold text-center"><span className="text-red-500">RE</span>Inventory</h1>
          
            {/* This is the new user menu structure */}
            <div className="absolute right-0">
              {user && (
                <div className="relative">
                  {/* User Icon Button to toggle the menu */}
                  <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>

                  {/* The Dropdown Menu panel */}
                  {isUserMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50"
                      // Optional: close menu when mouse leaves the dropdown area
                      onMouseLeave={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-600">
                        Signed in as<br/>
                        <strong className="font-medium text-white">{userProfile?.displayName || user.email}</strong>
                      </div>
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-blue-500"
                      >
                        Profile
                      </button>
                      <button 
                        onClick={() => {
                          auth.signOut();
                          setIsUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-blue-500"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        <div className="flex flex-col flex-grow">
            {renderContent()}
        </div>
      </div>
    </main>
  );
}
