import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, documentId, getDocs, doc, getDoc } from 'firebase/firestore';

export function usePlayerProfiles(campaignId) {
    const [playerProfiles, setPlayerProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId) {
            setIsLoading(false);
            return;
        }

        const fetchProfiles = async () => {
            setIsLoading(true);
            const campaignDocRef = doc(db, 'campaigns', campaignId);
            const campaignSnap = await getDoc(campaignDocRef);

            if (campaignSnap.exists()) {
                const campaignData = campaignSnap.data();
                if (campaignData.players && campaignData.players.length > 0) {
                    
                    // 1. Fetch the base user profiles (like displayName)
                    const profilesQuery = query(collection(db, "users"), where(documentId(), "in", campaignData.players));
                    const querySnapshot = await getDocs(profilesQuery);
                    const profiles = {};
                    querySnapshot.forEach((doc) => {
                        profiles[doc.id] = doc.data();
                    });

                    // **THIS IS THE FIX**: 2. Fetch the characterName for each player from their inventory
                    const characterNamePromises = campaignData.players.map(playerId => 
                        getDoc(doc(db, 'campaigns', campaignId, 'inventories', playerId))
                    );
                    const characterNameSnapshots = await Promise.all(characterNamePromises);

                    characterNameSnapshots.forEach(docSnap => {
                        if (docSnap.exists() && profiles[docSnap.id]) {
                            // 3. Merge the characterName into the profile object
                            profiles[docSnap.id].characterName = docSnap.data().characterName;
                        }
                    });

                    setPlayerProfiles(profiles);
                }
            }
            setIsLoading(false);
        };

        fetchProfiles();
    }, [campaignId]);

    return { playerProfiles, isLoading };
}