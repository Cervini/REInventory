import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, documentId, getDocs, doc, onSnapshot, getDoc } from 'firebase/firestore';

/**
 * Custom hook that listens for real-time changes to a campaign's player list.
 * When the list changes, it fetches the user profile for each player from the
 * 'users' collection and merges it with their corresponding character name from
 * the campaign's 'inventories' sub-collection.
 *
 * @param {string | null} campaignId The ID of the campaign to monitor.
 * @returns {{playerProfiles: object, isLoading: boolean}} An object containing the player profiles and the loading state.
 * @property {object} playerProfiles - An object where keys are player UIDs and values are their merged profile data (user data + characterName).
 * @property {boolean} isLoading - True while the campaign data and player profiles are being fetched.
 */
export function usePlayerProfiles(campaignId) {
    const [playerProfiles, setPlayerProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Listen for real-time changes to the campaign document, such as players joining or leaving.
        const campaignDocRef = doc(db, 'campaigns', campaignId);
        const unsubscribe = onSnapshot(campaignDocRef, async (campaignSnap) => {
            if (campaignSnap.exists()) {
                const campaignData = campaignSnap.data();
                const playerIds = campaignData.players || [];

                if (playerIds.length > 0) {
                    try {
                        // Fetch the user profiles for all players in the campaign
                        const profilesQuery = query(collection(db, "users"), where(documentId(), "in", playerIds));
                        const querySnapshot = await getDocs(profilesQuery);
                        const profiles = {};
                        querySnapshot.forEach((doc) => {
                            profiles[doc.id] = doc.data();
                        });

                        // Fetch the character names from their inventory documents
                        const characterNamePromises = playerIds.map(playerId => 
                            getDoc(doc(db, 'campaigns', campaignId, 'inventories', playerId))
                        );
                        const characterNameSnapshots = await Promise.all(characterNamePromises);

                        characterNameSnapshots.forEach(docSnap => {
                            if (docSnap.exists() && profiles[docSnap.id]) {
                                profiles[docSnap.id].characterName = docSnap.data().characterName;
                            }
                        });

                        setPlayerProfiles(profiles);
                    } catch (error) {
                        console.error("Error fetching player profiles:", error);
                    }
                } else {
                    setPlayerProfiles({}); // No players in the campaign
                }
            }
            setIsLoading(false);
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
        
    }, [campaignId]);

    return { playerProfiles, isLoading };
}