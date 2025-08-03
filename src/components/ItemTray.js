// src/components/ItemTray.js

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

export default function ItemTray({ campaignId, playerId, items, onContextMenu, isDM }) {

    const { setNodeRef, isOver } = useDroppable({ id: `${playerId}-tray` });

   return (
    // The main container for the tray
    <div className="bg-background/50 rounded-lg p-2 mt-2 border border-accent/10 shadow-inner">
      {/* This is the droppable area that now allows items to wrap */}
      <div 
        ref={setNodeRef} 
        // **THIS IS THE FIX**: Added `flex-wrap` and `gap-2` for a responsive grid layout.
        // The fixed height has been replaced with a minimum height for flexibility.
        className={`flex flex-wrap gap-2 items-center rounded-md transition-colors duration-200 min-h-[6rem] ${isOver ? 'bg-accent/10' : ''}`}
      >
        {items.length === 0 && (
          // Centered the "empty" message for a cleaner look when there are no items.
          <p className="text-text-muted text-sm px-4 font-fantasy italic w-full text-center">Tray is empty.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="w-20 h-20 flex-shrink-0">
            <InventoryItem
              item={item}
              onContextMenu={(e, item, source) => onContextMenu(e, item, playerId, source)}
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