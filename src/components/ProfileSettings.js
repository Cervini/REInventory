import React, { useState } from 'react';
import { db, auth} from '../firebase';
import { doc, setDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

export default function ProfileSettings({ user, userProfile, onClose }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Saves the user's updated profile settings (e.g., display name) to their document in Firestore.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setLoading(true);
    setError('');

    const userDocRef = doc(db, 'users', user.uid);
    try {
      // Save all profile fields, including the new dimensions
      await setDoc(userDocRef, { 
        displayName,
      }, { merge: true });
      onClose();
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiates the permanent deletion of the user's account and all associated data.
   * It gets an auth token and calls the `deleteUserAccount` Firebase Cloud Function.
   * It requires multiple confirmations from the user.
   */
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
      // This is now the name of our new onRequest function
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
        sessionStorage.removeItem('accountJustDeleted');
        throw new Error(result.error.message || 'Failed to delete account.');
      }
      
      // We no longer need to manually sign out. The auth state change will be detected.
      onClose();

    } catch (err) {
      toast.error(err.message);
      setLoading(false);
      sessionStorage.removeItem('accountJustDeleted');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-fantasy text-accent">
            Profile Settings
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-text-muted hover:bg-surface hover:text-text-base transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
          {error && <p className="text-destructive text-sm italic">{error}</p>}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>

        <div className="border-t border-destructive/20 mt-6 pt-4">
            <button onClick={handleDeleteAccount} disabled={loading} className="w-full bg-destructive/80 hover:bg-destructive text-text-base font-bold py-2 px-4 rounded transition-colors duration-200">
              {loading ? 'Deleting...' : 'Delete My Account'}
            </button>
        </div>
      </div>
    </div>
  );
}