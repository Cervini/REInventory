import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, writeBatch, getDoc, getDocs, collection } from "firebase/firestore";
import { calculateCarryingCapacity } from '../utils/dndUtils';

const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const sizeOptions = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export default function InventorySettings({ onClose, campaignId, userId, currentSettings, isDMInventory }) {
  const [characterName, setCharacterName] = useState(currentSettings.characterName || '');
  const [weightUnit, setWeightUnit] = useState(currentSettings.weightUnit || 'lbs');
  // State for containers now tracks edits, additions, and deletions
  const [containers, setContainers] = useState(Object.values(currentSettings.containers || {}));
  const [containersToDelete, setContainersToDelete] = useState([]);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(currentSettings.strength || 10);
  // States for the automatic weight
  const [size, setSize] = useState(currentSettings.size || 'Medium');
  const [useCalculatedWeight, setUseCalculatedWeight] = useState(currentSettings.useCalculatedWeight ?? false);
  // State for the manual weight input field
  const [manualMaxWeight, setManualMaxWeight] = useState('');

  /**
   * Updates a specific field of a container in the local state.
   * @param {string} containerId - The ID of the container to update.
   * @param {string} field - The name of the property to update (e.g., 'name', 'gridWidth').
   * @param {*} value - The new value for the field.
   */
  const handleContainerChange = (containerId, field, value) => {
    setContainers(prev => 
      prev.map(c => c.id === containerId ? { ...c, [field]: value } : c)
    );
  };

  /**
   * Adds a new, temporary container object to the local `containers` state.
   * This new container is flagged with `isNew: true` to be identified during the save process.
   */
  // Function to add a new, temporary container to the UI
  const handleAddNewContainer = () => {
    const newContainer = {
      id: `new-${Date.now()}`, // Temporary ID for the key
      name: "New Container",
      gridWidth: 10,
      gridHeight: 5,
      trackWeight: true,
      gridItems: [],
      trayItems: [], 
      isNew: true, // Flag to identify new containers
    };
    setContainers(prev => [...prev, newContainer]);
  };

  // Function to mark a container for deletion
  /**
   * Marks a container for deletion. It removes the container from the local UI state
   * and, if it's an existing container (not a new one), adds its ID to a separate
   * list to be deleted from Firestore on save.
   * @param {string} containerId - The ID of the container to delete.
   */
  const handleDeleteContainer = (containerId) => {
    if (!window.confirm("Are you sure you want to delete this container and all items within it? This cannot be undone.")) {
        return;
    }
    setContainers(prev => prev.filter(c => c.id !== containerId));
    // If it's not a newly added container, add its ID to the list for deletion from Firestore
    if (!containerId.startsWith('new-')) {
        setContainersToDelete(prev => [...prev, containerId]);
    }
  };

  /**
   * Saves all character and inventory settings to Firestore using a batched write.
   * This includes updating the character name and weight, creating new containers,
   * updating existing ones, and deleting marked containers.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalMaxWeightLbs;
    // for DM fields are set to default as they don't really matter
    if (!isDMInventory) {
        if (useCalculatedWeight) {
            finalMaxWeightLbs = calculateCarryingCapacity(strength, size);
        } else {
            const inputValue = parseFloat(manualMaxWeight);
            finalMaxWeightLbs = weightUnit === 'kg' ? inputValue * KG_TO_LBS : inputValue;
        }
    } else {
        finalMaxWeightLbs = currentSettings.totalMaxWeight || 0;
    }


    const batch = writeBatch(db);
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', userId);

    batch.update(inventoryDocRef, { 
      characterName: characterName.trim(),
      totalMaxWeight: finalMaxWeightLbs,
      weightUnit: weightUnit,
      strength: Number(strength),
      size: size,
      useCalculatedWeight: useCalculatedWeight,
    });

    if (!isDMInventory) {
        containers.forEach(container => {
            const isNew = container.isNew;
            const containerRef = isNew 
                ? doc(inventoryDocRef, 'containers', crypto.randomUUID()) 
                : doc(inventoryDocRef, 'containers', container.id);
            
            const containerData = {
                name: container.name,
                gridWidth: container.gridWidth,
                gridHeight: container.gridHeight,
                trackWeight: container.trackWeight ?? true, // 'true' if trackWeight undefined
                gridItems: container.gridItems || [],
                trayItems: container.trayItems || [],
            };

            if (isNew) {
                batch.set(containerRef, containerData);
            } else {
                batch.update(containerRef, containerData);
            }
        });
        
        for (const containerId of containersToDelete) {
            const containerRef = doc(inventoryDocRef, 'containers', containerId);
            batch.delete(containerRef);
        }
    }

    try {
      await batch.commit();
      toast.success("Inventory settings updated!");
      onClose();
    } catch (err) {
      toast.error("Unable to update inventory settings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the logic for a player to permanently leave a campaign.
   * It deletes the player's entire inventory (including all containers and items),
   * removes them from the campaign's player list and layout, and then reloads the page.
   * A confirmation dialog is shown before proceeding.
   */
  const handleLeaveCampaign = async () => {
        if (!window.confirm("Are you sure you want to leave this campaign? Your inventory will be permanently deleted.")) {
            return;
        }
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const campaignDocRef = doc(db, 'campaigns', campaignId);
            const campaignSnap = await getDoc(campaignDocRef);
            const campaignData = campaignSnap.data();

            // 1. Delete the user's inventory and containers
            const inventoryRef = doc(db, 'campaigns', campaignId, 'inventories', userId);
            const containersRef = collection(inventoryRef, 'containers');
            const containersSnap = await getDocs(containersRef);
            containersSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(inventoryRef);

            // 2. Update the campaign document to remove the user
            const newPlayers = campaignData.players.filter(p => p !== userId);
            const newOrder = campaignData.layout?.order.filter(p => p !== userId);
            const newVisible = { ...campaignData.layout?.visible };
            delete newVisible[userId];

            batch.update(campaignDocRef, {
                players: newPlayers,
                'layout.order': newOrder,
                'layout.visible': newVisible,
            });

            await batch.commit();
            toast.success("You have left the campaign.");
            // Force a reload to go back to the campaign selection screen
            window.location.reload();

        } catch (error) {
            toast.error("Failed to leave campaign.");
            console.error(error);
            setLoading(false);
        }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6 font-fantasy text-accent text-center">
          Character & Inventory Settings
        </h3>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Character Name --- */}
          <div>
            <label className="block text-sm font-bold mb-2 text-text-muted">Character Name</label>
            <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
          </div>

          {/* Character Stats --- */}
          {!isDMInventory && (
            <div className="space-y-4 border-t border-surface/50 pt-4">
                 <div className="flex space-x-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-bold mb-2 text-text-muted">Strength Score</label>
                        <input type="number" value={strength} onChange={(e) => setStrength(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-bold mb-2 text-text-muted">Character Size</label>
                        <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md">
                            {sizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center">
                    <input id="useCalculatedWeight" type="checkbox" checked={useCalculatedWeight} onChange={(e) => setUseCalculatedWeight(e.target.checked)} className="w-4 h-4 text-primary bg-background border-surface/50 rounded focus:ring-accent" />
                    <label htmlFor="useCalculatedWeight" className="ml-2 text-sm font-medium text-text-muted">Automatically calculate max weight from stats (5e rules)</label>
                </div>
            </div>
          )}

          {/* --- Max Weight Section (now conditional) --- */}
          {!isDMInventory && (
            <div className={`flex items-end space-x-4 pt-4 ${useCalculatedWeight ? 'opacity-50' : ''}`}>
                <div className="flex-grow">
                  <label className="block text-sm font-bold mb-2 text-text-muted">Total Max Weight</label>
                  <input 
                    type="number" 
                    value={useCalculatedWeight ? calculateCarryingCapacity(strength, size) * (weightUnit === 'kg' ? LBS_TO_KG : 1) : manualMaxWeight} 
                    onChange={(e) => setManualMaxWeight(e.target.value)}
                    disabled={useCalculatedWeight}
                    className="w-full p-2 bg-background border border-surface/50 rounded-md disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-text-muted">Unit</label>
                  <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md">
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
            </div>
          )}

          {/* Container Management Section */}
          {!isDMInventory && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold font-fantasy text-accent">Containers</h4>
              {containers.map((container) => (
                <div key={container.id} className="p-4 border border-surface/50 rounded-lg space-y-4 bg-background/50">
                  <div className="flex items-center justify-between">
                      <input 
                          type="text"
                          value={container.name}
                          onChange={(e) => handleContainerChange(container.id, 'name', e.target.value)}
                          className="font-bold text-lg bg-transparent border-b border-surface/50 focus:outline-none focus:border-accent"
                      />
                      <button type="button" onClick={() => handleDeleteContainer(container.id)} className="text-destructive/70 hover:text-destructive transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                      </button>
                  </div>

                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-2 text-text-muted">Grid Width</label>
                      <input type="number" min="1" value={container.gridWidth} onChange={(e) => handleContainerChange(container.id, 'gridWidth', parseInt(e.target.value, 10) || 1)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-2 text-text-muted">Grid Height</label>
                      <input type="number" min="1" value={container.gridHeight} onChange={(e) => handleContainerChange(container.id, 'gridHeight', parseInt(e.target.value, 10) || 1)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
                    </div>
                  </div>

                  {!isDMInventory && (
                      <div className="flex items-center">
                          <input 
                              id={`track-${container.id}`} 
                              type="checkbox" 
                              checked={container.trackWeight ?? true}
                              onChange={(e) => handleContainerChange(container.id, 'trackWeight', e.target.checked)} 
                              className="w-4 h-4 text-primary bg-background border-surface/50 rounded focus:ring-accent" />
                          <label htmlFor={`track-${container.id}`} className="ml-2 text-sm font-medium text-text-muted">Track weight for this container</label>
                      </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddNewContainer} className="w-full bg-surface/50 hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors border border-dashed border-surface">
                + Add New Container
              </button>
            </div>
          )}

          {!isDMInventory && (
              <div className="border-t border-destructive/20 mt-8 pt-4">
                  <h4 className="text-lg font-bold text-destructive mb-2">Danger Zone</h4>
                  <p className="text-sm text-text-muted mb-4">Leaving the campaign will permanently delete your character and their inventory for this campaign.</p>
                  <button 
                      type="button" 
                      onClick={handleLeaveCampaign} 
                      disabled={loading} 
                      className="w-full bg-destructive/80 hover:bg-destructive text-text-base font-bold py-2 px-4 rounded transition-colors duration-200"
                  >
                    {loading ? 'Leaving...' : 'Leave Campaign'}
                  </button>
              </div>
          )}
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors">
              {loading ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}