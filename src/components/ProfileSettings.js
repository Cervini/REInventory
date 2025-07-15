import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from "firebase/firestore";

export default function ProfileSettings({ user, currentDisplayName, onClose }) {
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await setDoc(userDocRef, { displayName: displayName }, { merge: true });
      onClose(); // Close the modal on success
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4">Profile Settings</h3>
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}