import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from '../firebase';

export function useCampaignData(campaignId, user) {
    const [inventories, setInventories] = useState({});
    const [campaign, setCampaign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!campaignId || !user) {
            setIsLoading(true);
            return;
        }

        setIsLoading(true);

        const campaignDocRef = doc(db, 'campaigns', campaignId);
        const unsubscribeCampaign = onSnapshot(campaignDocRef, (campaignDocSnap) => {
            if (campaignDocSnap.exists()) {
                setCampaign(campaignDocSnap.data());
            } else {
                console.error("Campaign not found!");
                setCampaign(null);
            }
        });

        const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
        let unsubscribeInventories = () => {};

        const setupInventoryListener = () => {
            onSnapshot(campaignDocRef, (campaignDocSnap) => {
                if (!campaignDocSnap.exists()) {
                    setIsLoading(false);
                    return;
                }

                const campaignData = campaignDocSnap.data();
                const isDM = campaignData.dmId === user.uid;

                unsubscribeInventories();

                if (isDM) {
                    // DM gets all inventories.
                    unsubscribeInventories = onSnapshot(inventoriesColRef, (snapshot) => {
                        const allInventories = {};
                        snapshot.forEach(doc => {
                            allInventories[doc.id] = { id: doc.id, ...doc.data() };
                        });
                        setInventories(allInventories);
                        setIsLoading(false);
                    });
                } else {
                    // A player ONLY gets their own inventory.
                    const playerInventoryDocRef = doc(inventoriesColRef, user.uid);
                    unsubscribeInventories = onSnapshot(playerInventoryDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setInventories({
                                [user.uid]: { id: docSnap.id, ...docSnap.data() }
                            });
                        }
                        setIsLoading(false);
                    });
                }
            });
        };

        setupInventoryListener();

        return () => {
            unsubscribeCampaign();
            unsubscribeInventories();
        };
    }, [campaignId, user]);

    return { inventories, setInventories, campaign, isLoading };
}