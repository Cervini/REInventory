import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
// Import the tools we need from firestore
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, arrayUnion, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';

// This component receives a function from App.js to set the active campaign
export default function CampaignSelector({ onCampaignSelected }) {
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myCampaigns, setMyCampaigns] = useState([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setLoading(true);
    // Create a query to find campaigns where the user's ID is in the 'players' array
    const campaignsRef = collection(db, 'campaigns');
    const q = query(campaignsRef, where('players', 'array-contains', currentUser.uid));

    getDocs(q)
      .then((querySnapshot) => {
        const campaigns = [];
        querySnapshot.forEach((doc) => {
          campaigns.push({ id: doc.id, ...doc.data() });
        });
        setMyCampaigns(campaigns);
      })
      .catch((error) => {
        console.error("Error fetching user campaigns: ", error);
        toast.error("Could not fetch your campaigns.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCreateCampaign = async () => {
    // Basic validation
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }

    setLoading(true);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error("You must be logged in to create a campaign.");
      setLoading(false);
      return;
    }

    try {
      // Create the main campaign document
      const campaignDocRef = await addDoc(collection(db, "campaigns"), {
        dmId: currentUser.uid, // Store the DM's user ID
        dmEmail: currentUser.email,
        createdAt: serverTimestamp(), // Store the creation date
        name: campaignName,
        players: [currentUser.uid] // Store a list of player IDs for later use
      });

      console.log("New campaign created with ID: ", campaignDocRef.id);

      // Create an initial, empty inventory for the DM (who is also the first player)
      // We create a reference to a new document inside the 'inventories' sub-collection
      const inventoryDocRef = doc(db, "campaigns", campaignDocRef.id, "inventories", currentUser.uid);
      
      // We use setDoc to create the document with our specific ID (the user's ID)
      await setDoc(inventoryDocRef, {
        gridItems: [], // Formerly "items"
        trayItems: [], // Add the new tray items array
        ownerId: currentUser.uid
      });

      console.log("Initial inventory created for DM.");
      // Tell the parent App component which campaign is now active
      onCampaignSelected(campaignDocRef.id);

    } catch (error) {
      console.error("Error creating campaign: ", error);
      toast.error("Failed to create campaign.");
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    const code = joinCode.trim();
    if (!code) {
      toast.error("Please enter a campaign code to join.");
      return;
    }

    setLoading(true);
    const currentUser = auth.currentUser;

    try {
      const campaignDocRef = doc(db, 'campaigns', code);
      const campaignSnap = await getDoc(campaignDocRef);

      // If the campaign exists
      if (!campaignSnap.exists()) {
        toast.error("Campaign not found. Please check the code and try again.");
        setLoading(false);
        return;
      }

      // Add user to the campaign's player list
      await updateDoc(campaignDocRef, {
        players: arrayUnion(currentUser.uid)
      });

      // New inventory document for the joining player
      const inventoryDocRef = doc(db, "campaigns", code, "inventories", currentUser.uid);
      await setDoc(inventoryDocRef, {
        gridItems: [],
        trayItems: [],
        ownerId: currentUser.uid
      }, { merge: true }); // Use {merge: true} to avoid overwriting if they rejoin

      console.log(`Successfully joined campaign: ${code}`);
      
      onCampaignSelected(code);

    } catch (error) {
      console.error("Error joining campaign: ", error);
      toast.error("Failed to join campaign.");
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId, campaignName) => {
    // Show a confirmation dialog before proceeding
    if (!window.confirm(`Are you sure you want to permanently delete the campaign "${campaignName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const inventoriesRef = collection(db, 'campaigns', campaignId, 'inventories');
      const inventorySnapshot = await getDocs(inventoriesRef);
      
      // Use a batched write to delete all sub-collection documents first
      const batch = writeBatch(db);
      inventorySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Now delete the main campaign document
      await deleteDoc(doc(db, 'campaigns', campaignId));

      // Update the UI locally to remove the campaign from the list
      setMyCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast.success(`Campaign "${campaignName}" deleted.`);

    } catch (error) {
      console.error("Error deleting campaign: ", error);
      toast.error("Failed to delete campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-surface shadow-lg shadow-accent/10 rounded-lg p-8 border border-accent/20">

      {/* --- Empty State --- */}
      {!loading && myCampaigns.length === 0 && (
        <div className="text-center text-text-muted mb-8 p-4 border border-dashed border-surface/50 rounded-lg">
          <p>You have no campaigns yet.</p>
          <p>Create a new one or join one below to begin your adventure!</p>
        </div>
      )}

      {/* --- Existing Campaigns List --- */}
      {myCampaigns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl text-center font-bold mb-4 text-accent font-fantasy">Your Campaigns</h2>
          <div className="space-y-2">
            {myCampaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center space-x-2">
                <button
                  onClick={() => onCampaignSelected(campaign.id)}
                  className="flex-grow bg-background hover:bg-surface/80 text-text-base font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                >
                  {campaign.name}
                </button>
                {auth.currentUser?.uid === campaign.dmId && (
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                    disabled={loading}
                    className="p-3 bg-destructive hover:bg-destructive/80 text-text-base rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors duration-200"
                    aria-label={`Delete campaign ${campaign.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="text-text-muted w-full text-center pt-6 font-fantasy tracking-widest">... OR ...</div>
        </div>
      )}

      {/* --- Create/Join Section --- */}
      <h2 className="text-2xl text-center font-bold mb-4 text-accent font-fantasy">New Chapter</h2>
      <div className="flex flex-col items-center space-y-4">
        {/* Create Campaign */}
        <input
          type="text"
          placeholder="Enter New Campaign Name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
        />
        <button
          onClick={handleCreateCampaign}
          disabled={loading}
          className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-6 rounded w-full disabled:opacity-50 transition-colors duration-200"
        >
          {loading ? 'Creating...' : 'Create New Campaign'}
        </button>
        
        {/* Join Campaign */}
        <input
          type="text"
          placeholder="Enter Join Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
        />
        <button
          onClick={handleJoinCampaign}
          disabled={loading}
          className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded w-full disabled:opacity-50 transition-colors duration-200"
        >
          {loading ? 'Joining...' : 'Join Campaign'}
        </button>
      </div>
    </div>
  );
}
