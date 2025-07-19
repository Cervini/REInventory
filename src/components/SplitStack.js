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
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-20 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-xs text-text-base">
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent text-center">Split Stack</h3>
        <div className="space-y-2 text-center mb-4">
            <p className="text-sm text-text-muted">
              Item: <span className="font-semibold text-text-base">{item.name}</span>
            </p>
            <p className="text-sm text-text-muted">
              Current Quantity: <span className="font-semibold text-text-base">{item.quantity}</span>
            </p>
        </div>
        
        <div className="mb-4">
            <label className="block text-sm font-bold mb-2 text-text-muted">Amount for NEW stack:</label>
            <input
              type="number"
              min="1"
              max={item.quantity - 1}
              value={splitAmount}
              onChange={(e) => setSplitAmount(e.target.value)}
              className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">Cancel</button>
            <button type="button" onClick={handleSplit} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">Split</button>
        </div>
      </div>
    </div>
  );
}