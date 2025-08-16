import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc, getDocs, writeBatch, collection } from 'firebase/firestore';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePlayer({ id, name, isVisible, onVisibilityChange, onRemovePlayer }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li ref={setNodeRef} style={style} {...attributes} className="p-3 bg-background rounded-md flex items-center justify-between shadow-sm">
            
            {/* Group the drag handle and the name */}
            <div className="flex items-center space-x-3">
                <button {...listeners} className="cursor-grab text-text-muted hover:text-text-base touch-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <span>{name || 'Unknown Player'}</span>
            </div>
            
            {/* Group the right-side controls */}
            <div className="flex items-center space-x-4">
                <input 
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onVisibilityChange(id)}
                    className="w-5 h-5 text-primary bg-background border-surface/50 rounded focus:ring-accent"
                />
                <button onClick={() => onRemovePlayer(id, name)} className="text-destructive/70 hover:text-destructive transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </li>
    );
}

export default function CampaignLayout({ campaign, inventories, playerProfiles, onClose }) {
    const initialOrder = useMemo(() => campaign.layout?.order || campaign.players || [], [campaign]);
    const [playerOrder, setPlayerOrder] = useState(initialOrder);
    const [visiblePlayers, setVisiblePlayers] = useState(campaign.layout?.visible || {});
    const [loading, setLoading] = useState(false);

    // Configure both Pointer and Touch sensors.
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            // Require a 250ms delay before a drag starts on touch devices
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPlayerOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleVisibilityChange = (playerId) => {
        setVisiblePlayers(prev => ({
            ...prev,
            [playerId]: !prev[playerId]
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const campaignDocRef = doc(db, 'campaigns', campaign.id);
            await updateDoc(campaignDocRef, {
                'layout.order': playerOrder,
                'layout.visible': visiblePlayers
            });
            toast.success("Layout saved!");
            onClose();
        } catch (error) {
            toast.error("Failed to save layout.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePlayer = async (playerId, playerName) => {
        if (!window.confirm(`Are you sure you want to remove ${playerName} from the campaign? This will permanently delete their inventory.`)) {
            return;
        }
        setLoading(true);
        try {
            const batch = writeBatch(db);

            // 1. Delete the player's inventory sub-collection (requires a separate fetch)
            const inventoryRef = doc(db, 'campaigns', campaign.id, 'inventories', playerId);
            const containersRef = collection(inventoryRef, 'containers');
            const containersSnap = await getDocs(containersRef);
            containersSnap.forEach(doc => batch.delete(doc.ref)); // Delete all containers
            batch.delete(inventoryRef); // Delete the main inventory doc

            // 2. Update the main campaign document
            const campaignDocRef = doc(db, 'campaigns', campaign.id);
            const newPlayers = campaign.players.filter(p => p !== playerId);
            const newOrder = playerOrder.filter(p => p !== playerId);
            const newVisible = { ...visiblePlayers };
            delete newVisible[playerId];

            batch.update(campaignDocRef, {
                players: newPlayers,
                'layout.order': newOrder,
                'layout.visible': newVisible,
            });

            await batch.commit();
            toast.success(`${playerName} has been removed from the campaign.`);
            // Update local state to match
            setPlayerOrder(newOrder);

        } catch (error) {
            toast.error("Failed to remove player.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Manage Layout</h3>
                <p className="text-text-muted mb-6 text-sm">Drag players to reorder them and use the checkbox to toggle their visibility.</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={playerOrder} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-2">
                            {playerOrder.map(playerId => (
                                <SortablePlayer
                                    key={playerId}
                                    id={playerId}
                                    name={inventories[playerId]?.characterName || playerProfiles[playerId]?.displayName}
                                    isVisible={visiblePlayers[playerId] ?? true}
                                    onVisibilityChange={handleVisibilityChange}
                                    onRemovePlayer={handleRemovePlayer}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
                <div className="flex justify-end space-x-4 pt-6">
                    <button type="button" onClick={onClose} disabled={loading} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={loading} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors">
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}