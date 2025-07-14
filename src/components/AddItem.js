import React, { useState } from 'react';

export default function AddItem({ onAddItem, onClose }) {
  const [name, setName] = useState('');
  const [w, setW] = useState(1);
  const [h, setH] = useState(1);
  const [color, setColor] = useState('bg-gray-500');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || w <= 0 || h <= 0) {
      alert("Please fill out all fields correctly.");
      return;
    }

    const newItem = {
      id: Date.now().toString(), // Simple unique ID
      name,
      w: parseInt(w, 10),
      h: parseInt(h, 10),
      color,
      x: 0, // Default position
      y: 0,
    };

    onAddItem(newItem); // Pass the new item up to the parent
    onClose(); // Close the form
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4">Add New Item</h3>
        <form onSubmit={handleSubmit}>
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
          {/* Width & Height */}
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
          {/* Color */}
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
          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded">Create Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}