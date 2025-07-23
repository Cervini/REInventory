import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

export default function ProfileSettings({ user, userProfile, onClose }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [gridWidth, setGridWidth] = useState(userProfile?.gridWidth || 30);
  const [gridHeight, setGridHeight] = useState(userProfile?.gridHeight || 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || gridWidth < 10 || gridHeight < 5) {
      setError("Display name cannot be empty and grid must be at least 10x5.");
      return;
    }
    setLoading(true);
    setError('');

    const userDocRef = doc(db, 'users', user.uid);
    try {
      // Save all profile fields, including the new dimensions
      await setDoc(userDocRef, { 
        displayName,
        gridWidth: parseInt(gridWidth, 10),
        gridHeight: parseInt(gridHeight, 10),
      }, { merge: true });
      onClose();
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you ABSOLUTELY sure?") || !window.confirm("This cannot be undone. Proceed?")) return;
    
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in.");
      }
      
      const token = await currentUser.getIdToken();

      sessionStorage.setItem('accountJustDeleted', 'true');
      
      const FIREBASE_REGION = 'us-central1'; // Make sure this region is correct
      const functionUrl = `https://${FIREBASE_REGION}-re-inventory-v2.cloudfunctions.net/deleteUserAccount`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          // Send the token in the Authorization header
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account.');
      }
      
      onClose();

    } catch (err) {
      toast.error(err.message);
      setLoading(false);
      sessionStorage.removeItem('accountJustDeleted');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-20 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-2xl font-bold mb-6 font-fantasy text-accent text-center">
          Profile Settings
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            />
          </div>
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2 text-text-muted">Grid Width</label>
              <input type="number" min="10" value={gridWidth} onChange={(e) => setGridWidth(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold mb-2 text-text-muted">Grid Height</label>
              <input type="number" min="5" value={gridHeight} onChange={(e) => setGridHeight(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200" />
            </div>
          </div>
          <p className="text-xs text-text-muted/80 pt-2">Warning: Changing grid size may cause items to be out of bounds.</p>
          {error && <p className="text-destructive text-sm italic">{error}</p>}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
        <div className="border-t border-destructive/20 mt-6 pt-4">
            <h4 className="text-destructive font-bold text-lg mb-2">Danger Zone</h4>
            <p className="text-sm text-text-muted mb-4">
              Deleting your account is permanent. All of your personal data, campaigns, and inventories will be removed.
            </p>
            <button onClick={handleDeleteAccount} disabled={loading} className="w-full bg-destructive hover:bg-destructive/80 text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">
              Delete My Account
            </button>
        </div>
      </div>
    </div>
  );
}