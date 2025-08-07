import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePlayer({ id, name, isVisible, onVisibilityChange }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li ref={setNodeRef} style={style} {...attributes} className="p-3 bg-background rounded-md flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
                <button {...listeners} className="cursor-grab text-text-muted hover:text-text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <span>{name || 'Unknown Player'}</span>
            </div>
            <input 
                type="checkbox"
                checked={isVisible}
                onChange={() => onVisibilityChange(id)}
                className="w-5 h-5 text-primary bg-background border-surface/50 rounded focus:ring-accent"
            />
        </li>
    );
}

export default function CampaignLayout({ campaign, inventories, playerProfiles, onClose }) {
    const initialOrder = useMemo(() => campaign.layout?.order || campaign.players || [], [campaign]);
    const [playerOrder, setPlayerOrder] = useState(initialOrder);
    const [visiblePlayers, setVisiblePlayers] = useState(campaign.layout?.visible || {});
    const [loading, setLoading] = useState(false);

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
    
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Manage Layout</h3>
                <p className="text-text-muted mb-6 text-sm">Drag players to reorder them and use the checkbox to toggle their visibility.</p>
                <DndContext sensors={useSensors(useSensor(PointerSensor))} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={playerOrder} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-2">
                            {playerOrder.map(playerId => (
                                <SortablePlayer
                                    key={playerId}
                                    id={playerId}
                                    name={inventories[playerId]?.characterName || playerProfiles[playerId]?.displayName}
                                    isVisible={visiblePlayers[playerId] ?? true}
                                    onVisibilityChange={handleVisibilityChange}
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