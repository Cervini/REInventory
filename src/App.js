import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
// Import main components
import InventoryGrid from './components/InventoryGrid';
import Auth from './components/Auth';
import CampaignSelector from './components/CampaignSelector';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // If user logs out, clear the campaign selection
      if (!currentUser) {
        setCampaignId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div>Loading...</div>; // Or a proper spinner component
    }

    // This function will be passed to CampaignSelector
    const handleCampaignSelect = (id) => {
      setCampaignId(id);
    };
    
    // This function allows the user to go back to campaign selection
    const handleBackToCampaigns = () => {
      setCampaignId(null);
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
      <div className="w-full max-w-4xl flex flex-col flex-grow">
        <div className="relative flex justify-center items-center mb-4">
          <h1 className="text-4xl font-bold text-center"><span className="text-red-500">RE</span>Inventory</h1>
          <div className="absolute right-0">
            {user && (
              <button 
                onClick={() => auth.signOut()}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign Out
              </button>
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
