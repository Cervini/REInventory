import React, { useState, useEffect } from 'react';
// Import the tools we need from firestore
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
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
        alert("Could not fetch your campaigns.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCreateCampaign = async () => {
    // Basic validation
    if (!campaignName.trim()) {
      alert("Please enter a campaign name.");
      return;
    }

    setLoading(true);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to create a campaign.");
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
        items: [], // Start with an empty items array
        ownerId: currentUser.uid
      });

      console.log("Initial inventory created for DM.");
      // Tell the parent App component which campaign is now active
      onCampaignSelected(campaignDocRef.id);

    } catch (error) {
      console.error("Error creating campaign: ", error);
      alert("Failed to create campaign.");
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    const code = joinCode.trim();
    if (!code) {
      alert("Please enter a campaign code to join.");
      return;
    }

    setLoading(true);
    const currentUser = auth.currentUser;

    try {
      const campaignDocRef = doc(db, 'campaigns', code);
      const campaignSnap = await getDoc(campaignDocRef);

      // If the campaign exists
      if (!campaignSnap.exists()) {
        alert("Campaign not found. Please check the code and try again.");
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
        items: [],
        ownerId: currentUser.uid
      }, { merge: true }); // Use {merge: true} to avoid overwriting if they rejoin

      console.log(`Successfully joined campaign: ${code}`);
      
      onCampaignSelected(code);

    } catch (error) {
      console.error("Error joining campaign: ", error);
      alert("Failed to join campaign.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800 shadow-md rounded-lg p-8">
      {/* 3. Display the list of existing campaigns */}
      {myCampaigns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl text-center font-bold mb-4 text-white">Your Campaigns</h2>
          <div className="space-y-2">
            {myCampaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => onCampaignSelected(campaign.id)}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {campaign.name}
              </button>
            ))}
          </div>
          <div className="text-gray-500 w-full text-center pt-6">--- OR ---</div>
        </div>
      )}

      <h2 className="text-xl text-center font-bold mb-4 text-white">Create or Join a Campaign</h2>
      <div className="flex flex-col items-center space-y-4">
        {/* --- Create Campaign Section --- */}
        <input
          type="text"
          placeholder="Enter New Campaign Name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline"
        />
        <button
          onClick={handleCreateCampaign}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded w-full disabled:bg-gray-500"
        >
          {loading ? 'Creating...' : 'Create New Campaign'}
        </button>
        
        {/* --- Join Campaign Section --- */}
        <input
          type="text"
          placeholder="Enter Join Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline"
        />
        <button
          onClick={handleJoinCampaign}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-gray-500"
        >
          {loading ? 'Joining...' : 'Join Campaign'}
        </button>
      </div>
    </div>
  );
}
