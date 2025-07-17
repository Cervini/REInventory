import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function SplitStack({ item, onClose, onSplit }) {
  // Default split amount is half the stack, rounded down.
  const [splitAmount, setSplitAmount] = useState(Math.floor(item.quantity / 2));

  const handleSplit = () => {
    const amount = parseInt(splitAmount, 10);
    // Validate the amount
    if (isNaN(amount) || amount <= 0 || amount >= item.quantity) {
      toast.error(`Please enter a number between 1 and ${item.quantity - 1}.`);
      return;
    }
    onSplit(amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xs text-white">
        <h3 className="text-xl font-bold mb-4">Split Stack</h3>
        <p className="text-sm mb-2">
          Item: <span className="font-semibold">{item.name}</span>
        </p>
        <p className="text-sm mb-4">
          Current Quantity: <span className="font-semibold">{item.quantity}</span>
        </p>
        
        <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Amount for NEW stack:</label>
            <input
              type="number"
              min="1"
              max={item.quantity - 1}
              value={splitAmount}
              onChange={(e) => setSplitAmount(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
        </div>

        <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancel</button>
            <button type="button" onClick={handleSplit} className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded">Split</button>
        </div>
      </div>
    </div>
  );
}