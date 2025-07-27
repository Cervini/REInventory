import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, app } from '../firebase';
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import ItemTray from './ItemTray';
import Spinner from './Spinner';
import InventoryItem from './InventoryItem';
import ContextMenu from './ContextMenu';
import { getColorForItemType } from '../utils/itemUtils';
import { findFirstAvailableSlot } from '../utils/gridUtils';

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
        const sourceLocation = active.data.current?.source;
        
        const endDroppableId = over.id.toString();
        const targetPlayerId = endDroppableId.replace('-offer', '').replace('-tray', '');
        const targetLocation = endDroppableId.includes('-offer') ? 'offer' : endDroppableId.includes('-tray') ? 'tray' : 'grid';

        if (sourcePlayerId !== user.uid) {
            return toast.error("You can only move your own items.");
        }
        
        const tradeDocRef = doc(db, 'trades', tradeId);
        const inventoryDocRef = doc(db, 'campaigns', tradeData.campaignId, 'inventories', user.uid);
        const userOfferField = user.uid === tradeData.playerA ? 'offerA' : 'offerB';

        const isMovingToOffer = targetLocation === 'offer' && targetPlayerId === user.uid;
        const isReturningFromOffer = sourceLocation === 'offer' && (targetLocation === 'grid' || targetLocation === 'tray') && targetPlayerId === user.uid;

        if (isMovingToOffer) {
            await updateDoc(tradeDocRef, { [userOfferField]: arrayUnion(item) });
            if (sourceLocation === 'grid') {
                await updateDoc(inventoryDocRef, { gridItems: arrayRemove(item) });
            } else { // from tray
                await updateDoc(inventoryDocRef, { trayItems: arrayRemove(item) });
            }
        } 
        else if (isReturningFromOffer) {
            await updateDoc(tradeDocRef, { [userOfferField]: arrayRemove(item) });
            if (targetLocation === 'grid') {
                const inventoryData = user.uid === tradeData.playerA ? playerAInventory : playerBInventory;
                const position = findFirstAvailableSlot(inventoryData.gridItems, item, inventoryData.gridWidth, inventoryData.gridHeight);
                if(position === null) {
                    toast.error("Grid is full! Returning to tray.");
                    await updateDoc(inventoryDocRef, { trayItems: arrayUnion(item) });
                } else {
                    await updateDoc(inventoryDocRef, { gridItems: arrayUnion({...item, ...position}) });
                }
            } else { // to tray
                await updateDoc(inventoryDocRef, { trayItems: arrayUnion(item) });
            }
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

    if (isLoading) { return <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm"><Spinner /></div>; }
    
    const isPlayerA = user.uid === tradeData.playerA;
    const you = { id: isPlayerA ? tradeData.playerA : tradeData.playerB, inventory: isPlayerA ? playerAInventory : playerBInventory, offer: isPlayerA ? tradeData.offerA : tradeData.offerB, accepted: isPlayerA ? tradeData.acceptedA : tradeData.acceptedB };
    const otherPlayer = { id: isPlayerA ? tradeData.playerB : tradeData.playerA, inventory: isPlayerA ? playerBInventory : playerAInventory, offer: isPlayerA ? tradeData.offerB : tradeData.offerA, accepted: isPlayerA ? tradeData.acceptedB : tradeData.acceptedA };

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-auto">
                        <div className="flex flex-col space-y-2">
                            <h4 className="font-bold text-lg">{playerProfiles[you.id]?.displayName || 'Your'} Offer</h4>
                            <TradeOffer items={you.offer} playerId={you.id} isDM={user.uid === campaign.dmId} onContextMenu={handleContextMenu} />
                            <div className="flex-grow">
                                <PlayerInventoryGrid items={you.inventory.gridItems} gridWidth={you.inventory.gridWidth} gridHeight={you.inventory.gridHeight} playerId={you.id} isDM={user.uid === campaign.dmId} onContextMenu={handleContextMenu} isTradeMode={true}/>
                            </div>
                            <ItemTray items={you.inventory.trayItems} playerId={you.id} isDM={user.uid === campaign.dmId} onContextMenu={handleContextMenu} isTradeMode={true} />
                        </div>
                        <div className="flex flex-col space-y-2 opacity-70 pointer-events-none">
                           <h4 className="font-bold text-lg">{playerProfiles[otherPlayer.id]?.displayName}'s Offer</h4>
                            <TradeOffer items={otherPlayer.offer} playerId={otherPlayer.id} isDM={user.uid === campaign.dmId} onContextMenu={handleContextMenu} />
                             <div className="flex-grow">
                                <PlayerInventoryGrid items={otherPlayer.inventory.gridItems} gridWidth={otherPlayer.inventory.gridWidth} gridHeight={otherPlayer.inventory.gridHeight} playerId={otherPlayer.id} />
                            </div>
                            <ItemTray items={otherPlayer.inventory.trayItems} playerId={otherPlayer.id} />
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