import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

export default function CharacterName({ onClose, campaignId, playerId, currentName }) {
  const [characterName, setCharacterName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!characterName.trim()) {
      toast.error("Character name cannot be empty.");
      return;
    }
    setLoading(true);

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    try {
      await updateDoc(inventoryDocRef, {
        characterName: characterName.trim(),
      });
      toast.success("Character name updated!");
      onClose();
    } catch (err) {
      toast.error("Failed to update name.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6 font-fantasy text-accent text-center">
          Edit Character Name
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">New Name</label>
            <input 
                type="text" 
                value={characterName} 
                onChange={(e) => setCharacterName(e.target.value)} 
                className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}