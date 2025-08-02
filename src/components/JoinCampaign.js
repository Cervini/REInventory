// src/components/JoinCampaign.js

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
// Import the new hook
import { useStarterPacks } from '../hooks/useStarterPacks';

export default function JoinCampaign({ campaignId, onClose, onJoinSuccess }) {
  const [characterName, setCharacterName] = useState('');
  const [selectedPackId, setSelectedPackId] = useState('none');
  const [loading, setLoading] = useState(false);
  
  // Use the new hook to get the packs
  const { packs, isLoading: packsLoading } = useStarterPacks();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!characterName.trim()) {
      toast.error("Please enter a character name.");
      return;
    }
    setLoading(true);
    const currentUser = auth.currentUser;
    
    let startingItems = [];
    if (selectedPackId !== 'none') {
        const selectedPack = packs.find(p => p.id === selectedPackId);
        if (selectedPack) {
            // Give each item a unique ID before adding it
            startingItems = selectedPack.items.map(item => ({
                ...item,
                id: crypto.randomUUID()
            }));
        }
    }

    try {
      const campaignDocRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignDocRef, {
        players: arrayUnion(currentUser.uid)
      });

      const inventoryDocRef = doc(db, "campaigns", campaignId, "inventories", currentUser.uid);
      await setDoc(inventoryDocRef, {
        characterName: characterName.trim(),
        ownerId: currentUser.uid,
        gridItems: [],
        // Add the starting items to the tray
        trayItems: startingItems,
        gridWidth: 15,
        gridHeight: 5,
      }, { merge: true });

      toast.success(`Welcome, ${characterName.trim()}!`);
      onJoinSuccess(campaignId);

    } catch (error) {
      console.error("Error joining campaign: ", error);
      toast.error("Failed to join campaign. The code may be invalid.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Join Campaign</h3>
        <p className="text-text-muted mb-6 text-sm">Create your character for this new adventure.</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Character Name</label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g., Billy Ray Valentine"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Starting Pack</label>
            <select 
                value={selectedPackId}
                onChange={(e) => setSelectedPackId(e.target.value)}
                disabled={packsLoading} 
                className="w-full p-2 bg-background border border-surface/50 rounded-md disabled:opacity-50"
            >
              <option value="none">Standard Equipment (None)</option>
              {packs.map(pack => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors">
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}