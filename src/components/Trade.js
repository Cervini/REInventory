import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, app, auth } from '../firebase';
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import Spinner from './Spinner';
import InventoryItem from './InventoryItem';
import ContextMenu from './ContextMenu';
import { getColorForItemType } from '../utils/itemUtils';

function TradeOffer({ items, playerId, isDM, onContextMenu, isOver }) {
    const { setNodeRef } = useDroppable({ id: `${playerId}-offer` });
    return (
        <div ref={setNodeRef} className={`bg-background/50 h-24 rounded-lg p-2 flex items-center space-x-2 overflow-x-auto border ${isOver ? 'border-accent' : 'border-accent/20'} transition-colors`}>
            {items.length === 0 && <p className="text-text-muted text-sm px-2 italic">Offer is empty.</p>}
            {items.map(item => (
                 <div key={item.id} className="w-20 h-20 flex-shrink-0">
                    <InventoryItem item={item} source="offer" playerId={playerId} isDM={isDM} onContextMenu={onContextMenu}/>
                 </div>
            ))}
        </div>
    );
}

export default function Trade({ onClose, tradeId, user, playerProfiles, campaign }) {
    const [tradeData, setTradeData] = useState(null);
    const [playerAInventory, setPlayerAInventory] = useState(null);
    const [playerBInventory, setPlayerBInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeItem, setActiveItem] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, position: null, actions: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tradeDocRef = doc(db, 'trades', tradeId);
        const unsubscribe = onSnapshot(tradeDocRef, (doc) => {
            if (doc.exists()) {
                setTradeData({ id: doc.id, ...doc.data() });
            } else {
                onClose(); 
            }
        });
        return () => unsubscribe();
    }, [tradeId, onClose]);

    useEffect(() => {
        if (!tradeData) return;
        
        let inventoryA = null;
        let inventoryB = null;

        // This function only sets loading to false when BOTH inventories have been fetched
        const checkCompletion = () => {
            if (inventoryA && inventoryB) {
                setIsLoading(false);
            }
        };

        const unsubA = onSnapshot(doc(db, 'campaigns', tradeData.campaignId, 'inventories', tradeData.playerA), (doc) => {
            inventoryA = doc.data() || { gridItems: [], trayItems: [] }; // Provide a default empty state
            setPlayerAInventory(inventoryA);
            checkCompletion();
        });
        const unsubB = onSnapshot(doc(db, 'campaigns', tradeData.campaignId, 'inventories', tradeData.playerB), (doc) => {
            inventoryB = doc.data() || { gridItems: [], trayItems: [] }; // Provide a default empty state
            setPlayerBInventory(inventoryB);
            checkCompletion();
        });

        return () => {
            unsubA();
            unsubB();
        };
    }, [tradeData]);

    useEffect(() => {
        if (tradeData && tradeData.acceptedA && tradeData.acceptedB) {
        const finalize = async () => {
            try {
            const currentUser = auth.currentUser;
            if (!currentUser) { throw new Error("Authentication not ready, please wait."); }
            
            const token = await currentUser.getIdToken(true);

            const FIREBASE_REGION = 'us-central1'; // Make sure this is your correct region
            const functionUrl = `https://${FIREBASE_REGION}-re-inventory-v2.cloudfunctions.net/finalizeTrade`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: { tradeId: tradeData.id } })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error.message || 'Failed to finalize trade.');
            }

            toast.success(result.data.message);
            } catch (error) {
            toast.error(error.message);
            }
        };
        finalize();
        }
    }, [tradeData]);

    useEffect(() => {
        if (tradeData && tradeData.acceptedA && tradeData.acceptedB) {
            const functions = getFunctions(app, 'us-central1');
            const finalizeTrade = httpsCallable(functions, 'finalizeTrade');
            finalizeTrade({ tradeId: tradeData.id })
                .then(() => toast.success("Trade complete!"))
                .catch((error) => toast.error(error.message));
        }
    }, [tradeData, onClose]);

    const handleDragStart = (event) => {
        const item = event.active.data.current?.item;
        if (!item) return;
        setActiveItem({ item, dimensions: { width: 80, height: 80 } });
    };

    const handleDragEnd = async (event) => {
        setActiveItem(null);
        const { active, over } = event;
        if (!over || !active || !tradeData) return;

        const item = active.data.current?.item;
        const sourcePlayerId = active.data.current?.ownerId;
        const sourceLocation = active.data.current?.source; // 'grid', 'tray', 'offer'

        const endDroppableId = over.id.toString();
        const isDroppingOnOffer = endDroppableId.includes('-offer');
        // The droppable ID for our new list
        const isDroppingOnInventory = endDroppableId.includes('-inventory-list');

        if (sourcePlayerId !== user.uid) {
            return toast.error("You can only move your own items.");
        }

        const tradeDocRef = doc(db, 'trades', tradeId);
        const inventoryDocRef = doc(db, 'campaigns', tradeData.campaignId, 'inventories', user.uid);
        const userOfferField = user.uid === tradeData.playerA ? 'offerA' : 'offerB';

        // A flag to check if an offer was changed
        let offerChanged = false;

        // Moving item TO offer from the list
        if (isDroppingOnOffer && (sourceLocation === 'grid' || sourceLocation === 'tray')) {
            const itemCameFromGrid = sourceLocation === 'grid';
            await updateDoc(tradeDocRef, { [userOfferField]: arrayUnion(item) });
            if (itemCameFromGrid) {
                await updateDoc(inventoryDocRef, { gridItems: arrayRemove(item) });
            } else {
                await updateDoc(inventoryDocRef, { trayItems: arrayRemove(item) });
            }
            offerChanged = true;
        } 
        // Moving item FROM offer back to the list
        else if (isDroppingOnInventory && sourceLocation === 'offer') {
            await updateDoc(tradeDocRef, { [userOfferField]: arrayRemove(item) });
            const {x, y, ...trayItem} = item;
            await updateDoc(inventoryDocRef, { trayItems: arrayUnion(trayItem) });
            offerChanged = true;
        }

        // If any offer was modified, reset both players' acceptance status
        if (offerChanged) {
            await updateDoc(tradeDocRef, {
                acceptedA: false,
                acceptedB: false,
            });
        }
    };

    const handleAcceptTrade = async () => {
        const userAcceptField = user.uid === tradeData.playerA ? 'acceptedA' : 'acceptedB';
        await updateDoc(doc(db, 'trades', tradeId), { [userAcceptField]: true });
        toast.success("You have accepted the trade.");
    };
    
    const handleCancelTrade = async () => {
        setLoading(true);
        try {
            const functions = getFunctions(app, 'us-central1');
            const cancelTrade = httpsCallable(functions, 'cancelTrade');
            await cancelTrade({ tradeId: tradeId });
            toast.error("Trade cancelled.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleContextMenu = (event, item, source) => {
        event.preventDefault();
        const availableActions = [];

        if (source === 'offer' && item.ownerId === user.uid) {
            availableActions.push({ 
                label: "Remove from Offer", 
                onClick: () => { 
                    const tradeDocRef = doc(db, 'trades', tradeId);
                    const userOfferField = user.uid === tradeData.playerA ? 'offerA' : 'offerB';
                    updateDoc(tradeDocRef, { [userOfferField]: arrayRemove(item) });
                 }
            })
        }
        
        setContextMenu({
            visible: true,
            position: {x: event.clientX, y: event.clientY},
            actions: availableActions,
        });
    };

    function DraggableListItem({ item, playerId }) {
        const {attributes, listeners, setNodeRef} = useDraggable({
            id: item.id,
            // We need to know the original source to remove it from the correct array
            data: { ownerId: playerId, item: item, source: item.originalSource },
        });

        const tooltipContent = `
            <div style="text-align: left;">
            <strong>${item.name}</strong> (${item.rarity || 'Common'})
            <hr style="margin: 5px 0; border-color: #555;" />
            <div>${item.description || 'No description.'}</div>
            </div>
        `;

        return (
            <div 
            ref={setNodeRef} 
            {...listeners} 
            {...attributes} 
            className="p-2 bg-surface/80 rounded-md flex justify-between items-center cursor-grab hover:bg-surface transition-colors"
            data-tooltip-id="item-tooltip"
            data-tooltip-html={tooltipContent}
            >
            <span>{item.name} {item.quantity > 1 ? <span className="text-text-muted text-sm">x{item.quantity}</span> : ''}</span>
            </div>
        )
    }

    // Add this new component inside Trade.js as well
    function InventoryList({ droppableId, items, playerId }) {
        const { setNodeRef, isOver } = useDroppable({ id: droppableId });

        return (
            <div ref={setNodeRef} className={`flex-grow overflow-auto border border-surface/50 rounded-lg p-2 space-y-2 ${isOver ? 'bg-accent/10' : ''}`}>
            {items.length > 0 ? items.map(item => (
                <DraggableListItem key={item.id} item={item} playerId={playerId}/>
            )) : (
                <p className="text-text-muted text-center italic p-4">Your inventory is empty.</p>
            )}
            </div>
        );
    }

    if (isLoading) { return <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm"><Spinner /></div>; }
    
    const isPlayerA = user.uid === tradeData.playerA;
    const you = { id: isPlayerA ? tradeData.playerA : tradeData.playerB, inventory: isPlayerA ? playerAInventory : playerBInventory, offer: isPlayerA ? tradeData.offerA : tradeData.offerB, accepted: isPlayerA ? tradeData.acceptedA : tradeData.acceptedB };
    const otherPlayer = { id: isPlayerA ? tradeData.playerB : tradeData.playerA, inventory: isPlayerA ? playerBInventory : playerAInventory, offer: isPlayerA ? tradeData.offerB : tradeData.offerA, accepted: isPlayerA ? tradeData.acceptedB : tradeData.acceptedA };

    // Combine grid and tray items into a single list for display
    const allMyItems = [
        ...(you.inventory.gridItems || []).map(i => ({...i, originalSource: 'grid'})),
        ...(you.inventory.trayItems || []).map(i => ({...i, originalSource: 'tray'}))
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm p-4">
             {contextMenu.visible && (
                <ContextMenu
                    menuPosition={contextMenu.position}
                    actions={contextMenu.actions}
                    onClose={() => setContextMenu({ visible: false })}
                />
            )}
            <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-4 rounded-lg shadow-xl w-full h-full flex flex-col">
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
                    <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent text-center">Trading Table</h3>

                    <div className="flex flex-col md:flex-row flex-grow overflow-auto gap-4 min-h-0">

                      {/* --- Offers Section --- */}
                      <div className="flex flex-col space-y-4 md:w-1/3">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{playerProfiles[you.id]?.displayName || 'Your'} Offer</h4>
                          <TradeOffer items={you.offer} playerId={you.id} isDM={user.uid === campaign.dmId} onContextMenu={handleContextMenu} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">{playerProfiles[otherPlayer.id]?.displayName}'s Offer</h4>
                          {otherPlayer.accepted && (
                            <span className="bg-green-800/80 text-text-base text-xs font-bold px-2 py-1 rounded-md">
                              Accepted
                            </span>
                          )}
                          <TradeOffer items={otherPlayer.offer} playerId={otherPlayer.id} isDM={user.uid === campaign.dmId} onContextMenu={() => {}} />
                        </div>
                      </div>

                      {/* --- User's Inventory List Section --- */}
                      <div className="flex flex-col space-y-2 flex-grow md:w-2/3 min-h-0">
                        <h4 className="font-bold text-lg">Your Inventory</h4>
                        <InventoryList droppableId={`${you.id}-inventory-list`} items={allMyItems} playerId={you.id}/>
                      </div>
                    </div>

                    <DragOverlay>
                        {activeItem ? <div className={`${getColorForItemType(activeItem.item.type)} w-20 h-20 rounded-lg p-2 text-sm`}>{activeItem.item.name}</div> : null}
                    </DragOverlay>
                </DndContext>
                <div className="flex justify-between items-center pt-4">
                    <button onClick={handleCancelTrade} disabled={loading} className="bg-destructive/80 hover:bg-destructive text-text-base font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                        {loading ? 'Cancelling...' : 'Cancel Trade'}
                    </button>
                    <button onClick={handleAcceptTrade} disabled={you.accepted} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                        {you.accepted ? 'Waiting...' : 'Accept Trade'}
                    </button>
                </div>
            </div>
        </div>
    );
}