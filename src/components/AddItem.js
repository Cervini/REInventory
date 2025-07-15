// src/components/AddItem.js

import React, { useState, useEffect } from 'react';

// 1. Accept new props: players and dmId
export default function AddItem({ onAddItem, onClose, players, dmId, playerProfiles }) {
  const [name, setName] = useState('');
  const [w, setW] = useState(1);
  const [h, setH] = useState(1);
  const [color, setColor] = useState('bg-gray-500');
  // 2. New state to hold the selected player ID
  const [targetPlayerId, setTargetPlayerId] = useState(dmId || '');

  // Set the default selection to the DM if players list loads
  useEffect(() => {
    setTargetPlayerId(dmId);
  }, [dmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || w <= 0 || h <= 0 || !targetPlayerId) {
      alert("Please fill out all fields and select a player.");
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name,
      w: parseInt(w, 10),
      h: parseInt(h, 10),
      color,
      x: 0,
      y: 0,
    };
    
    // 3. Pass both the item and the target player's ID back up
    onAddItem(newItem, targetPlayerId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4">Add New Item</h3>
        <form onSubmit={handleSubmit}>
          {/* 4. Add the Player Select dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Player</label>
            <select 
              value={targetPlayerId} 
              onChange={(e) => setTargetPlayerId(e.target.value)} 
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
          
          {/* Item Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {/* Width, Height, Color inputs (no changes) */}
          <div className="flex space-x-4 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2">Width (w)</label>
              <input type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2">Height (h)</label>
              <input type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">Color</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                <option value="bg-gray-500">Gray</option>
                <option value="bg-blue-500">Blue</option>
                <option value="bg-red-500">Red</option>
                <option value="bg-green-500">Green</option>
                <option value="bg-yellow-500">Yellow</option>
                <option value="bg-purple-500">Purple</option>
            </select>
          </div>
          
          {/* Buttons (no changes) */}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded">Create Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}