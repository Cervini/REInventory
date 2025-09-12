import { create } from 'zustand';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

export const useCampaignStore = create((set, get) => ({
  // --- STATE ---
  campaignData: null,
  inventories: {},
  isLoading: true,
  error: null,
  
  // To hold the Firestore listeners so we can unsubscribe later
  campaignListener: null,
  inventoriesListener: null,
  containerListeners: {},

  // --- ACTIONS ---
  
  /**
   * Fetches and listens to real-time updates for a specific campaign.
   * @param {string} campaignId - The ID of the campaign to fetch.
   */
  fetchCampaign: (campaignId) => {
    // Unsubscribe from any previous listeners before starting new ones
    get().clearCampaign();
    if (!campaignId) {
      return set({ isLoading: false, campaignData: null, inventories: {} });
    }

    set({ isLoading: true });

    // --- Main Campaign Listener ---
    const campaignDocRef = doc(db, 'campaigns', campaignId);
    const campaignUnsub = onSnapshot(campaignDocRef, (campaignDoc) => {
      set({ campaignData: campaignDoc.exists() ? campaignDoc.data() : null });
    }, (err) => {
      console.error("Error fetching campaign:", err);
      set({ error: 'Failed to fetch campaign.', isLoading: false });
    });

    // --- Inventories & Containers Listener ---
    const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
    const inventoriesUnsub = onSnapshot(inventoriesColRef, (invSnapshot) => {
      const currentListeners = get().containerListeners;
      const newInventories = get().inventories;
      const allPlayerIds = invSnapshot.docs.map(d => d.id);

      // Unsubscribe from players who left
      Object.keys(currentListeners).forEach(playerId => {
        if (!allPlayerIds.includes(playerId)) {
          currentListeners[playerId]();
          delete currentListeners[playerId];
        }
      });
      
      invSnapshot.forEach(invDoc => {
        const playerId = invDoc.id;
        const invData = invDoc.data();

        // Update top-level inventory data
        newInventories[playerId] = { ...(newInventories[playerId] || {}), ...invData, id: playerId };
        
        // Subscribe to container listeners for new players
        if (!currentListeners[playerId]) {
          const containersColRef = collection(invDoc.ref, 'containers');
          currentListeners[playerId] = onSnapshot(containersColRef, (containersSnap) => {
            const playerContainers = {};
            containersSnap.forEach(containerDoc => {
              playerContainers[containerDoc.id] = { id: containerDoc.id, ...containerDoc.data() };
            });
            
            // Update the state with the new container data for this player
            set(state => ({
              inventories: {
                ...state.inventories,
                [playerId]: { ...state.inventories[playerId], containers: playerContainers },
              }
            }));
          });
        }
      });

      set({ inventories: newInventories, isLoading: false, containerListeners: currentListeners });
    }, (err) => {
      console.error("Error fetching inventories:", err);
      set({ error: 'Failed to fetch inventories.', isLoading: false });
    });

    // Store the unsubscribe functions
    set({ campaignListener: campaignUnsub, inventoriesListener: inventoriesUnsub });
  },

  /**
   * Cleans up all Firestore listeners.
   */
  clearCampaign: () => {
    const { campaignListener, inventoriesListener, containerListeners } = get();
    if (campaignListener) campaignListener();
    if (inventoriesListener) inventoriesListener();
    Object.values(containerListeners).forEach(unsub => unsub());
    set({ 
      campaignData: null, 
      inventories: {}, 
      isLoading: true, 
      error: null,
      campaignListener: null,
      inventoriesListener: null,
      containerListeners: {}
    });
  },

  /**
   * Updates the inventories state locally for an optimistic UI update.
   * @param {object} newInventories - The complete, updated inventories object.
   */
  setInventoriesOptimistic: (newInventories) => {
    set({ inventories: newInventories });
  },
}));