import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import Spinner from './Spinner';

// A simple, clickable list item for display
function ItemListItem({ item, onClick }) {
  const tooltipContent = `
    <div style="text-align: left;">
      <strong>${item.name}</strong> (${item.rarity || 'Common'})
      <hr style="margin: 5px 0; border-color: #555;" />
      <div>${item.description || 'No description.'}</div>
    </div>
  `;

  return (
    <button
      onClick={onClick}
      className="p-2 w-full text-left bg-surface/80 rounded-md flex justify-between items-center cursor-pointer hover:bg-surface transition-colors"
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
    >
      <span>{item.name} {item.quantity > 1 ? <span className="text-text-muted text-sm">x{item.quantity}</span> : ''}</span>
    </button>
  );
}

// The box showing items being offered
function TradeOffer({ items, onItemClick }) {
    return (
        <div className="bg-background/50 min-h-[6rem] h-24 rounded-lg p-2 flex items-center space-x-2 overflow-x-auto border border-accent/20">
            {items.length === 0 ? (
                <p className="text-text-muted text-sm px-2 italic w-full text-center">Offer is empty.</p>
            ) : (
                items.map(item => (
                    <div
                        key={item.id}
                        className="w-24 h-full flex-shrink-0"
                    >
                       <ItemListItem item={item} onClick={() => onItemClick(item)} />
                    </div>
                ))
            )}
        </div>
    );
}

export default function Trade({ onClose, tradeId, user, playerProfiles }) {
    const [tradeData, setTradeData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Local state for the user's available inventory and current offer
    const [localInventory, setLocalInventory] = useState([]);
    const [localOffer, setLocalOffer] = useState([]);
    const [otherPlayerOffer, setOtherPlayerOffer] = useState([]);
    const [isInventoryLoaded, setIsInventoryLoaded] = useState(false);


    // This effect listens for REAL-TIME changes to the trade document
    useEffect(() => {
        const tradeDocRef = doc(db, 'trades', tradeId);
        const unsubscribe = onSnapshot(tradeDocRef, (doc) => {
            if (!doc.exists()) {
                // The document was deleted, so we must close the modal.
                // This handles cancellation for both players and success for Player B.
                onClose();
                return;
            }
            const updatedTradeData = doc.data();
            setTradeData(updatedTradeData);

            const isPlayerA = user.uid === updatedTradeData.playerA;
            setOtherPlayerOffer(isPlayerA ? updatedTradeData.offerB : updatedTradeData.offerA);
            setLocalOffer(isPlayerA ? updatedTradeData.offerA : updatedTradeData.offerB);
        }, (error) => {
            // If we get an error, it's safest to just close the trade window.
            console.error("Snapshot listener error:", error);
            onClose();
        });
        // This cleanup function is crucial for preventing memory leaks
        return () => unsubscribe();
    }, [tradeId, user.uid, onClose]);

    // This effect fetches the user's FULL inventory ONCE the tradeData is loaded
    useEffect(() => {
        if (!tradeData || isInventoryLoaded) return;

        const fetchInitialInventory = async () => {
            setIsLoading(true);
            const inventoryDocRef = doc(db, 'campaigns', tradeData.campaignId, 'inventories', user.uid);
            const docSnap = await getDoc(inventoryDocRef);

            if (docSnap.exists()) {
                const inventory = docSnap.data();
                const allItems = [...(inventory.gridItems || []), ...(inventory.trayItems || [])];
                const offerIds = new Set(localOffer.map(i => i.id));
                setLocalInventory(allItems.filter(i => !offerIds.has(i.id)));
                setIsInventoryLoaded(true);
            }
            setIsLoading(false);
        };

        fetchInitialInventory();
    }, [tradeData, user.uid, localOffer, isInventoryLoaded]);


    useEffect(() => {
        // **THIS IS THE FIX**: Added a check for isFinalizing
        if (tradeData && tradeData.acceptedA && tradeData.acceptedB && !isFinalizing) {
            if (user.uid === tradeData.playerA) {
                // Set the flag immediately to prevent this from running again
                setIsFinalizing(true);
                
                const finalize = async () => {
                    try {
                        const currentUser = auth.currentUser;
                        if (!currentUser) { throw new Error("Authentication not ready."); }
                        
                        const token = await currentUser.getIdToken(true);
                        const FIREBASE_REGION = 'us-central1';
                        const functionUrl = `https://${FIREBASE_REGION}-re-inventory-v2.cloudfunctions.net/finalizeTrade`;

                        const response = await fetch(functionUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ data: { tradeId: tradeId } })
                        });

                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result.error.message || 'Failed to finalize trade.');
                        }
                        
                        // On success, show the toast and THEN close the modal.
                        // This prevents the snapshot listener from firing on a deleted document.
                        toast.success(result.data.message);
                        onClose();

                    } catch (error) {
                        toast.error(error.message);
                        // If finalization fails, reset acceptance so they can try again
                        await updateDoc(doc(db, 'trades', tradeId), { acceptedA: false, acceptedB: false });
                        setIsFinalizing(false); // Allow another attempt
                    }
                };
                finalize();
            }
        }
    }, [tradeData, user.uid, tradeId, onClose, isFinalizing]); // Add isFinalizing to dependencies


    const handleItemClick = async (item, source) => {
        let newLocalInventory, newLocalOffer;

        if (source === 'inventory') {
            newLocalInventory = localInventory.filter(i => i.id !== item.id);
            newLocalOffer = [...localOffer, item];
        } else {
            newLocalOffer = localOffer.filter(i => i.id !== item.id);
            newLocalInventory = [...localInventory, item];
        }

        setLocalInventory(newLocalInventory);
        setLocalOffer(newLocalOffer);

        const userOfferField = user.uid === tradeData.playerA ? 'offerA' : 'offerB';
        await updateDoc(doc(db, 'trades', tradeId), {
            [userOfferField]: newLocalOffer,
            acceptedA: false,
            acceptedB: false,
        });
    };

    const handleAcceptTrade = async () => {
        setIsSubmitting(true);
        const userOfferField = user.uid === tradeData.playerA ? 'offerA' : 'offerB';
        const userAcceptField = user.uid === tradeData.playerA ? 'acceptedA' : 'acceptedB';

        try {
            await updateDoc(doc(db, 'trades', tradeId), {
                [userOfferField]: localOffer,
                [userAcceptField]: true,
            });
            toast.success("You have accepted the trade.");
        } catch(error) {
            toast.error("Failed to accept trade.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelTrade = async () => {
        setIsSubmitting(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) { throw new Error("Authentication not ready."); }
            
            const token = await currentUser.getIdToken(true);
            const FIREBASE_REGION = 'us-central1';
            const functionUrl = `https://${FIREBASE_REGION}-re-inventory-v2.cloudfunctions.net/cancelTrade`;

            await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: { tradeId: tradeId } })
            });
            // The snapshot listener will handle the onClose call automatically.
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !tradeData) {
        return <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm"><Spinner /></div>;
    }

    const isPlayerA = user.uid === tradeData.playerA;
    const yourData = { id: user.uid, accepted: isPlayerA ? tradeData.acceptedA : tradeData.acceptedB };
    const otherPlayer = { id: isPlayerA ? tradeData.playerB : tradeData.playerA, accepted: isPlayerA ? tradeData.acceptedB : tradeData.acceptedA };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-4 rounded-lg shadow-xl w-full h-full flex flex-col">
                <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent text-center">Trading Table</h3>
                <div className="flex flex-col md:flex-row flex-grow overflow-auto gap-4 min-h-0">
                  <div className="flex flex-col space-y-4 md:w-1/3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-lg">{playerProfiles[yourData.id]?.displayName || 'Your'} Offer</h4>
                      </div>
                      <TradeOffer items={localOffer} onItemClick={(item) => handleItemClick(item, 'offer')} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-lg">{playerProfiles[otherPlayer.id]?.displayName}'s Offer</h4>
                          {otherPlayer.accepted && (
                            <span className="bg-green-800/80 text-text-base text-xs font-bold px-2 py-1 rounded-md">
                              Accepted
                            </span>
                          )}
                      </div>
                      <TradeOffer items={otherPlayerOffer} onItemClick={() => {}} />
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 flex-grow md:w-2/3 min-h-0">
                    <h4 className="font-bold text-lg">Your Inventory</h4>
                    <div className="flex-grow overflow-auto border border-surface/50 rounded-lg p-2 space-y-2">
                        {localInventory.map(item => (
                            <ItemListItem
                                key={item.id}
                                item={item}
                                onClick={() => handleItemClick(item, 'inventory')}
                            />
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                    <button onClick={handleCancelTrade} disabled={isSubmitting} className="bg-destructive/80 hover:bg-destructive text-text-base font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                        {isSubmitting ? '...' : 'Cancel Trade'}
                    </button>
                    <button onClick={handleAcceptTrade} disabled={yourData.accepted || isSubmitting} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                        {isSubmitting ? '...' : (yourData.accepted ? 'Waiting...' : 'Accept Trade')}
                    </button>
                </div>
            </div>
        </div>
    );
}