import React, { useState } from 'react';
// Import the tools we need from firestore
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

// This component receives a function from App.js to set the active campaign
export default function CampaignSelector({ onCampaignSelected }) {
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');

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

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800 shadow-md rounded-lg p-8">
      <h2 className="text-2xl text-center font-bold mb-6 text-white">Select a Campaign</h2>
      <p className="text-center text-gray-400 mb-8">
        Create a new campaign to get started, or enter a code to join one.
      </p>
      
      <div className="flex flex-col items-center space-y-4">
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
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-gray-500"
        >
          {loading ? 'Creating...' : 'Create New Campaign'}
        </button>
        
        <div className="text-gray-500 w-full text-center pt-4">--- OR ---</div>
        
        <input
          type="text"
          placeholder="Enter Join Code"
          className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline"
          disabled
        />
        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full opacity-50 cursor-not-allowed"
          disabled
        >
          Join Campaign
        </button>
      </div>
    </div>
  );
}
