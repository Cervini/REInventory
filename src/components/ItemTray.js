import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';


/**
 * Renders a droppable area for items that are not in a grid (e.g., on the floor).
 * It displays a list of items in a flexible row.
 * @param {object} props - The component props.
 * @param {string} props.playerId - The ID of the player who owns this tray.
 * @param {Array<object>} props.items - The array of item objects in the tray.
 * @param {Function} props.onContextMenu - The context menu handler.
 * @param {string} props.containerId - The ID representing this tray (e.g., 'tray' or a DM container ID).
 * @returns {JSX.Element}
 */
export default function ItemTray({ playerId, items, onContextMenu, isDM, containerId }) {

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