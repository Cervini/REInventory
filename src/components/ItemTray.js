import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

// This component will eventually become a "droppable" zone.
// For now, it just displays the items.
export default function ItemTray({ campaignId, playerId, items, onContextMenu, isDM }) {

    const { setNodeRef } = useDroppable({
        id: `${playerId}-tray`,
    });

    return (
        <div className="bg-background/70 rounded-lg p-2 mt-2">
            <div ref={setNodeRef} className="flex space-x-2 overflow-x-auto h-24 items-center">
                {items.length === 0 && (
                <p className="text-text-muted text-sm px-4">Tray is empty.</p>
                )}
                {items.map(item => (
                <div key={item.id} className="w-20 h-20 flex-shrink-0">
                    <InventoryItem
                    item={item}
                    onContextMenu={(e, item) => onContextMenu(e, item, playerId)}
                    playerId={playerId}
                    isDM={isDM}
                    source="tray"
                    />
                </div>
                ))}
            </div>
        </div>
    );
}