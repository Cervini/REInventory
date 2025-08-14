import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, documentId, getDocs, doc, onSnapshot, getDoc } from 'firebase/firestore';

export function usePlayerProfiles(campaignId) {
    const [playerProfiles, setPlayerProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // THIS IS THE FIX: We now use onSnapshot to listen for real-time changes
        // to the campaign document, such as players joining or leaving.
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