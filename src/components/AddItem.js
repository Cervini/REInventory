import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function AddItem({ onAddItem, onClose, players = [], dmId, playerProfiles = {}, itemToEdit, isDM }) {
  
  const isEditMode = !!itemToEdit;
  const itemBeingEdited = isEditMode ? itemToEdit.item : null;

  // --- Form State ---
  const [name, setName] = useState(isEditMode ? itemBeingEdited.name : '');
  const [w, setW] = useState(isEditMode ? itemBeingEdited.w : 1);
  const [h, setH] = useState(isEditMode ? itemBeingEdited.h : 1);
  const [color, setColor] = useState(isEditMode ? itemBeingEdited.color : 'bg-gray-500');
  const [stackable, setStackable] = useState(isEditMode ? itemBeingEdited.stackable ?? false : false);
  const [quantity, setQuantity] = useState(isEditMode ? itemBeingEdited.quantity ?? 1 : 1);
  const [targetPlayerId, setTargetPlayerId] = useState(isEditMode ? itemToEdit.playerId : (dmId || ''));
  
  // 1. New state for the detailed item properties
  const [type, setType] = useState(isEditMode ? itemBeingEdited.type ?? '' : '');
  const [cost, setCost] =useState(isEditMode ? itemBeingEdited.cost ?? '' : '');
  const [weight, setWeight] = useState(isEditMode ? itemBeingEdited.weight ?? '' : '');
  const [description, setDescription] = useState(isEditMode ? itemBeingEdited.description ?? '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || w <= 0 || h <= 0) {
      toast.error("Please fill out all fields correctly.");
      return;
    }
    
    // 2. Create the data object with all the new fields
    const itemData = {
        name,
        w: parseInt(w, 10),
        h: parseInt(h, 10),
        color,
        stackable,
        quantity: parseInt(quantity, 10),
        type,
        cost,
        weight,
        description,
    };

    if (isEditMode) {
      onAddItem(itemData);
    } else {
      if (!targetPlayerId) {
        toast.error("Please select a player.");
        return;
      }
      onAddItem({
        id: crypto.randomUUID(),
        ...itemData,
        x: 0,
        y: 0,
      }, targetPlayerId);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-20 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <h3 className="text-2xl font-bold mb-6 font-fantasy text-accent text-center">
          {isEditMode ? 'Edit Item' : 'Add New Item'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Player & Item Name Section */}
          <fieldset className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-text-muted">Player</label>
              <select 
                value={targetPlayerId} 
                onChange={(e) => setTargetPlayerId(e.target.value)} 
                disabled={isEditMode}
                className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 disabled:opacity-50"
              >
                <option value="">-- Select a Player --</option>
                {players.map(playerId => (
                  <option key={playerId} value={playerId}>
                    {playerProfiles[playerId]?.displayName || playerId}
                    {playerId === dmId ? ' (DM)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-text-muted">Item Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
          </fieldset>

          {/* Item Details Section */}
          <fieldset className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2 text-text-muted">Type</label>
              <input type="text" placeholder="e.g., Weapon" value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
            {isDM && (
              <div className="w-1/4">
                <label className="block text-sm font-bold mb-2 text-text-muted">Cost</label>
                <input type="text" placeholder="e.g., 15gp" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
              </div>
            )}
            <div className={isDM ? "w-1/4" : "w-1/2"}>
              <label className="block text-sm font-bold mb-2 text-text-muted">Weight</label>
              <input type="text" placeholder="e.g., 3 lbs" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
          </fieldset>
          
          {/* Grid Properties Section */}
          <fieldset className="flex space-x-4">
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2 text-text-muted">Width</label>
              <input type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2 text-text-muted">Height</label>
              <input type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2 text-text-muted">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={!stackable && !isEditMode} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 disabled:opacity-50" />
            </div>
          </fieldset>
          
          {/* Description */}
          <fieldset>
            <label className="block text-sm font-bold mb-2 text-text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"></textarea>
          </fieldset>

          {/* Color & Stackable Section */}
          <fieldset className="flex justify-between items-center pt-2">
            <div>
              <label className="block text-sm font-bold mb-2 text-text-muted">Color</label>
              <div className="flex space-x-2">
                {['bg-gray-500', 'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'].map(c => (
                  <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${c} border-2 ${color === c ? 'border-accent' : 'border-surface/20'} transition-all duration-200`}></button>
                ))}
              </div>
            </div>
            <div className="flex items-center pt-6">
              <input id="stackable" type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} disabled={isEditMode} className="w-4 h-4 text-primary bg-background border-surface/50 rounded focus:ring-accent" />
              <label htmlFor="stackable" className="ml-2 text-sm font-medium text-text-muted">Item is Stackable</label>
            </div>
          </fieldset>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">Cancel</button>
            <button type="submit" className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">
              {isEditMode ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}