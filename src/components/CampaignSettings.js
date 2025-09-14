import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function CampaignSettings({ campaign, onClose }) {
  const [campaignName, setCampaignName] = useState(campaign.name || '');
  const [defaultBackpackSize, setDefaultBackpackSize] = useState({
    width: 10,
    height: 5,
  });
  const [loading, setLoading] = useState(false);

  /**
   * Handles the form submission to update the campaign settings in Firestore.
   * This includes the campaign name and the default backpack size for new characters.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const campaignDocRef = doc(db, 'campaigns', campaign.id);
      await updateDoc(campaignDocRef, {
        name: campaignName,
        defaultBackpackSize: {
          width: Number(defaultBackpackSize.width),
          height: Number(defaultBackpackSize.height),
        },
      });
      toast.success('Campaign settings updated!');
      onClose();
    } catch (error) {
      toast.error('Failed to update campaign settings.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Campaign Settings</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Campaign Name</label>
            <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Default Backpack Size</label>
            <div className="flex space-x-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-text-muted">Width</label>
                <input type="number" value={defaultBackpackSize.width} onChange={(e) => setDefaultBackpackSize({ ...defaultBackpackSize, width: e.target.value })} className="w-20 p-2 bg-background border border-surface/50 rounded-md" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-text-muted">Height</label>
                <input type="number" value={defaultBackpackSize.height} onChange={(e) => setDefaultBackpackSize({ ...defaultBackpackSize, height: e.target.value })} className="w-20 p-2 bg-background border border-surface/50 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}