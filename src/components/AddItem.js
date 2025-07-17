import React, { useState } from 'react';

export default function AddItem({ onAddItem, onClose, players = [], dmId, playerProfiles = {}, itemToEdit }) {
  
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
      alert("Please fill out all fields correctly.");
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
        alert("Please select a player.");
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Item' : 'Add New Item'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... (Player dropdown is the same) ... */}

          {/* Item Name */}
          <div>
            <label className="block text-sm font-bold mb-2">Item Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>

          {/* 3. New inputs for Type, Cost, and Weight */}
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2">Type (e.g., Weapon)</label>
              <input type="text" value={type} onChange={(e) => setType(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="w-1/4">
              <label className="block text-sm font-bold mb-2">Cost (e.g., 15gp)</label>
              <input type="text" value={cost} onChange={(e) => setCost(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="w-1/4">
              <label className="block text-sm font-bold mb-2">Weight (e.g., 3lb)</label>
              <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
          </div>
          
          {/* Fields w, h and quantity */}
          <div className="flex space-x-4 mb-4">
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2">Width</label>
              <input type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2">Height</label>
              <input type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-bold mb-2">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={!stackable && !isEditMode} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-900" />
            </div>
          </div>
          {/* Stackable Checkbox */}
          <div className="mb-4 flex items-center">
            <input 
              id="stackable"
              type="checkbox"
              checked={stackable}
              onChange={(e) => setStackable(e.target.checked)}
              disabled={isEditMode}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="stackable" className="ml-2 text-sm font-medium">Item is Stackable</label>
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
          
          {/* NEW Description textarea */}
          <div>
            <label className="block text-sm font-bold mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded">
              {isEditMode ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}