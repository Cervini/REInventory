import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

export default function ItemTray({ campaignId, playerId, items, onContextMenu, isDM, containerId }) {

    const { setNodeRef, isOver } = useDroppable({ id: `${playerId}|${containerId}|tray` });

   return (
    <div className="bg-background/50 rounded-lg p-2 mt-2 border border-accent/10 shadow-inner">
      <div 
        ref={setNodeRef} 
        className={`flex flex-wrap gap-2 items-center rounded-md transition-colors duration-200 min-h-[6rem] ${isOver ? 'bg-accent/10' : ''}`}
      >
        {items.length === 0 && (
          <p className="text-text-muted text-sm px-4 font-fantasy italic w-full text-center">There is nothing on the ground.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="w-20 h-20 flex-shrink-0">
            <InventoryItem
              item={item}
              containerId={containerId}
              onContextMenu={(e, item, source) => onContextMenu(e, item, playerId, source, containerId)}
              playerId={playerId}
              isDM={isDM}
              source="tray"
              cellSize={{ width: 80, height: 80 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}