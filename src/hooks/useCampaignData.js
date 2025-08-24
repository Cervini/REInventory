import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from '../firebase';
/**
 * Custom hook to manage all real-time data for a specific campaign.
 * It fetches the main campaign document, the top-level data for all player inventories,
 * and the nested container data within each inventory.
 *
 * Crucially, it dynamically manages listeners for each player's containers,
 * subscribing and unsubscribing as players join or leave the campaign.
 *
 * @param {string | null} campaignId The ID of the campaign to fetch data for.
 * @param {object | null} user The currently authenticated user object.
 * @returns {{inventories: object, setInventories: Function, campaign: object | null, isLoading: boolean}} An object containing all campaign-related data and state.
 * @property {object} inventories - An object where keys are player UIDs (inventory IDs) and values are their complete inventory data, including nested containers.
 * @property {Function} setInventories - The setter function for the inventories state, allowing for manual or optimistic updates from components.
 * @property {object | null} campaign - The data from the main campaign document.
 * @property {boolean} isLoading - True while the initial data for the campaign and inventories is being fetched.
 */
export function useCampaignData(campaignId, user) {
    const [inventories, setInventories] = useState({});
    const [campaign, setCampaign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Use a ref to hold the listener unsubscribe functions.
    const containerListenersRef = useRef({});

    // Get data about the current campaign from Firestore.
    useEffect(() => {
        if (!campaignId || !user) {
            setIsLoading(true);
            setInventories({});
            return;
        }

        setIsLoading(true);

        const campaignDocRef = doc(db, 'campaigns', campaignId);
        const unsubscribeCampaign = onSnapshot(campaignDocRef, (campaignDocSnap) => {
            setCampaign(campaignDocSnap.exists() ? campaignDocSnap.data() : null);
        });

        const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
        const unsubscribeInventories = onSnapshot(inventoriesColRef, (inventoriesSnapshot) => {
            
            // This logic safely merges updates to top-level inventory data (like trayItems)
            // without discarding the container data that is loaded by a separate listener.
            setInventories(prevInventories => {
                const newInventories = { ...prevInventories };
                inventoriesSnapshot.forEach(doc => {
                    const existingData = newInventories[doc.id] || {};
                    newInventories[doc.id] = {
                        ...existingData, // IMPORTANT: Preserve existing container data
                        ...doc.data(), // Overwrite with fresh top-level data
                        id: doc.id,
                    };
                });
                return newInventories;
            });

            // Manage container listeners based on the current inventories
            const currentInventoryIds = inventoriesSnapshot.docs.map(doc => doc.id);
            const currentListeners = containerListenersRef.current;

            // Unsubscribe from listeners for players who are no longer in the campaign
            Object.keys(currentListeners).forEach(inventoryId => {
                if (!currentInventoryIds.includes(inventoryId)) {
                    currentListeners[inventoryId](); // Call the unsubscribe function
                    delete currentListeners[inventoryId];
                }
            });

            // Subscribe to container listeners for new players
            currentInventoryIds.forEach(inventoryId => {
                if (!currentListeners[inventoryId]) {
                    const containersColRef = collection(db, 'campaigns', campaignId, 'inventories', inventoryId, 'containers');
                    // Store the new unsubscribe function in our ref
                    currentListeners[inventoryId] = onSnapshot(containersColRef, (containersSnapshot) => {
                        const playerContainers = {};
                        containersSnapshot.forEach((containerDoc) => {
                            playerContainers[containerDoc.id] = { id: containerDoc.id, ...containerDoc.data() };
                        });
                        
                        // Merge the new container data into the state
                        setInventories(prev => ({
                            ...prev,
                            [inventoryId]: {
                                ...(prev[inventoryId] || {}),
                                containers: playerContainers,
                            }
                        }));
                    });
                }
            });

            setIsLoading(false);
        });

        // Main cleanup function for the entire effect
        return () => {
            unsubscribeCampaign();
            unsubscribeInventories();
            // Unsubscribe from all active container listeners
            Object.values(containerListenersRef.current).forEach(unsubscribe => unsubscribe());
            containerListenersRef.current = {};
        };
    }, [campaignId, user]);

    return { inventories, setInventories, campaign, isLoading };
}