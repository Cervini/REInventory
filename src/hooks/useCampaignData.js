import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from '../firebase';

export function useCampaignData(campaignId, user) {
    const [inventories, setInventories] = useState({});
    const [campaign, setCampaign] = useState(null);
    const [playerProfiles, setPlayerProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId || !user) return;

        setIsLoading(true);
        let unsubscribeInventories = () => {};

        const fetchData = async () => {
            const campaignDocRef = doc(db, 'campaigns', campaignId);
            const campaignSnap = await getDoc(campaignDocRef);

            if (!campaignSnap.exists()) {
                console.error("Campaign not found!");
                return;
            }

            const campaignData = campaignSnap.data();
            setCampaign(campaignData);

            if (campaignData.players && campaignData.players.length > 0) {
                const profilesQuery = query(collection(db, "users"), where(documentId(), "in", campaignData.players));
                const querySnapshot = await getDocs(profilesQuery);
                const profiles = {};
                querySnapshot.forEach((doc) => {
                    profiles[doc.id] = doc.data();
                });
                setPlayerProfiles(profiles);
            }

            const isDM = campaignData.dmId === user.uid;
            const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');

            if (isDM) {
                unsubscribeInventories = onSnapshot(inventoriesColRef, (snapshot) => {
                    const allInventories = {};
                    snapshot.forEach(doc => {
                        allInventories[doc.id] = {
                            gridItems: doc.data().gridItems || [],
                            trayItems: doc.data().trayItems || [],
                            // Fetch grid dimensions for each player
                            gridWidth: doc.data().gridWidth || 30,
                            gridHeight: doc.data().gridHeight || 10,
                        };
                    });
                    setInventories(allInventories);
                });
            } else {
                const inventoryDocRef = doc(inventoriesColRef, user.uid);
                unsubscribeInventories = onSnapshot(inventoryDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setInventories({
                            [user.uid]: {
                                gridItems: docSnap.data().gridItems || [],
                                trayItems: docSnap.data().trayItems || [],
                                // Fetch grid dimensions for the current player
                                gridWidth: docSnap.data().gridWidth || 30,
                                gridHeight: docSnap.data().gridHeight || 10,
                            }
                        });
                    }
                });
            }
        };

        fetchData().finally(() => setIsLoading(false));

        return () => {
            unsubscribeInventories();
        };
    }, [campaignId, user]);

    return { inventories, setInventories, campaign, playerProfiles, isLoading };
}