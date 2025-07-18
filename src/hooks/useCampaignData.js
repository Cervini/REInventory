import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from '../firebase';

export function useCampaignData(campaignId, user, userProfile) {
    const [inventories, setInventories] = useState({});
    const [campaign, setCampaign] = useState(null);
    const [playerProfiles, setPlayerProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId || !user) return;

        setIsLoading(true);

        const fetchData = async () => {
            const campaignDocRef = doc(db, 'campaigns', campaignId);
            const campaignSnap = await getDoc(campaignDocRef);

            if (!campaignSnap.exists()) {
                console.error("Campaign not found!");
                return () => {}; // Return an empty unsubscribe function
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
            if (isDM) {
                const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
                return onSnapshot(inventoriesColRef, (snapshot) => {
                    const allInventories = {};
                    snapshot.forEach(doc => {
                        allInventories[doc.id] = {
                            gridItems: doc.data().gridItems || [],
                            trayItems: doc.data().trayItems || [],
                        };
                    });
                    setInventories(allInventories);
                });
            } else {
                const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
                return onSnapshot(inventoryDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setInventories({
                            [user.uid]: {
                                gridItems: docSnap.data().gridItems || [],
                                trayItems: docSnap.data().trayItems || [],
                            }
                        });
                    }
                });
            }
        };

        const unsubscribePromise = fetchData().finally(() => setIsLoading(false));

        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) {
                    unsubscribe();
                }
            });
        };
    }, [campaignId, user]);

    useEffect(() => {
        if (userProfile && user) {
            setPlayerProfiles(prevProfiles => ({
                ...prevProfiles,
                [user.uid]: userProfile
            }));
        }
    }, [userProfile, user]);

    return { inventories, setInventories, campaign, playerProfiles, isLoading };
}