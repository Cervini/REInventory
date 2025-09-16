import React from 'react';

// --- CONFIGURATION ---
// To show a new "What's New" message:
// 1. Update the 'version' to a new unique value (e.g., the date).
// 2. Set the 'expiryDate' for when the message should stop appearing.
// 3. Update the 'title' and 'content'.
export const whatsNewConfig = {
  version: '2025-09-16', // Unique ID for this message. Change for new messages.
  expiryDate: '2025-10-01', // Date to stop showing this. Format: YYYY-MM-DD
  title: "Version 2.10.2: Listening to feedbacks",
  content: (
    <div className="space-y-4 text-text-base/90 text-sm">
      <p>Welcome to the latest version of REInventory! Based on your valuable feedback, I've introduced some major updates to make your D&D inventory management even smoother! This update includes new features for both players and Dungeon Masters, a more intuitive encumbrance system, and new customization options.</p>
      
      <h2 className="text-lg font-fantasy text-accent pt-2">Simplified Encumberance</h2>
      <p>The app now calculates your character's maximum weight for you. Simply input your character's Strength and Size in the Character & Inventory Settings menu, and you're good to go!</p>
      
      <h2 className="text-lg font-fantasy text-accent pt-2">Upgraded Gear</h2>
      <p>Weapons and armor are now smarter! Just add a "+1" to their name, and the app will automatically apply the stat bonuses.</p>
      
      <h2 className="text-lg font-fantasy text-accent pt-2">DM Character Inventories</h2>
      <p>DMs can now create and manage their own character inventories directly within a campaign.</p>

      <h2 className="text-lg font-fantasy text-accent pt-2">Campaign Management</h2>
      <p>Dungeon Masters now have more control! You can now edit campaign names and set the default starting backpack size for new characters.</p>

      <h2 className="text-lg font-fantasy text-accent pt-2">Hidden Magic Properties</h2>
      <p>Dungeon Masters can now add secret "magic properties" to items that remain hidden from players until they are revealed.</p>

      <h2 className="text-lg font-fantasy text-accent pt-2">Item Icons</h2>
      <p>We've added a new way to organize your inventory! You can now give each item an icon to help you quickly find what you're looking for.</p>
    
      <h2 className="text-lg font-fantasy text-accent pt-2">Equipping Items</h2>
      <p>Items can now be equipped by characters, equipped items will still affect the total weight but won't fill the inventory. You can choose to show or hide equipped items.</p>

      <h2 className="text-lg font-fantasy text-accent pt-2">Bug fixes and stability improvements</h2>
      
    </div>
  ),
};

/**
 * A modal component to display "What's New" information to the user.
 * It's designed to be shown only once per version until an expiry date.
 * @param {object} props - The component props.
 * @param {Function} props.onClose - Callback function to close the modal.
 */
export default function WhatsNewModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent text-center">{whatsNewConfig.title}</h3>
        
        <div className="flex-grow overflow-auto pr-2">
          {whatsNewConfig.content}
        </div>

        <div className="flex justify-end pt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}