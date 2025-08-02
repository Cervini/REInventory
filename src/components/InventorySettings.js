import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

// The props now include all the settings we need to edit
export default function InventorySettings({ onClose, campaignId, userId, currentSettings }) {
  const [characterName, setCharacterName] = useState(currentSettings.characterName || '');
  const [gridWidth, setGridWidth] = useState(currentSettings.gridWidth || 30);
  const [gridHeight, setGridHeight] = useState(currentSettings.gridHeight || 10);
  const [maxWeight, setMaxWeight] = useState(currentSettings.maxWeight || 100);
  const [weightUnit, setWeightUnit] = useState(currentSettings.weightUnit || 'lbs');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!characterName.trim()) {
      toast.error("Character name cannot be empty.");
      return;
    }
    if (gridWidth < 10 || gridHeight < 5) {
      toast.error("Grid must be at least 10x5.");
      return;
    }
    setLoading(true);

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', userId);
    try {
      // Update all fields in a single operation
      await updateDoc(inventoryDocRef, {
        characterName: characterName.trim(),
        gridWidth: parseInt(gridWidth, 10),
        gridHeight: parseInt(gridHeight, 10),
        maxWeight: Number(maxWeight),
        weightUnit: weightUnit,
      });
      toast.success("Settings updated!");
      onClose();
    } catch (err) {
      toast.error("Failed to update settings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6 font-fantasy text-accent text-center">
          Character & Inventory Settings
        </h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Character Name</label>
            <input 
                type="text" 
                value={characterName} 
                onChange={(e) => setCharacterName(e.target.value)} 
                className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2 text-text-muted">Grid Width</label>
              <input type="number" min="10" value={gridWidth} onChange={(e) => setGridWidth(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2 text-text-muted">Grid Height</label>
              <input type="number" min="5" value={gridHeight} onChange={(e) => setGridHeight(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          
          <div className="flex items-end space-x-4">
            <div className="flex-grow">
              <label className="block text-sm font-bold mb-2 text-text-muted">Max Weight</label>
              <input 
                  type="number" 
                  value={maxWeight} 
                  onChange={(e) => setMaxWeight(e.target.value)} 
                  className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-text-muted">Unit</label>
              <select 
                value={weightUnit} 
                onChange={(e) => setWeightUnit(e.target.value)}
                className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-text-muted/80 pt-2">Warning: Changing grid size may cause items to be out of bounds and move to your tray.</p>
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