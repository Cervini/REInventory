import React from 'react';
// 1. We now only need useDroppable from dnd-kit
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

export default function PlayerInventoryGrid({ campaignId, playerId, items, onContextMenu, setGridRef, isDM, gridWidth, gridHeight }) {
  
  // 2. Make this component a droppable zone, identified by the playerId
  const { setNodeRef } = useDroppable({
    id: playerId,
  });

  const combinedRef = (node) => {
      setNodeRef(node);
      setGridRef(node);
    };

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
    gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
    aspectRatio: `${gridWidth} / ${gridHeight}`,
    gap: '1px',
  };

  // 3. All logic for handleDragEnd, useEffect, and refs has been REMOVED.

  return (
    // 4. The main div is now a droppable area, and no longer wrapped in DndContext
    <div
      ref={combinedRef}
      style={gridStyle}
      className="w-full h-auto grid bg-gray-700 rounded-lg relative"
    >
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
          <p>Inventory is empty.</p>
        </div>
      )}

      {Array.from({ length: gridWidth * gridHeight }).map((_, index) => (
        <div key={index} className="bg-gray-800/50 rounded-sm"></div>
      ))}
      
      {items.map(item => (
        <InventoryItem
          key={item.id}
          item={item}
          onContextMenu={(e, item) => onContextMenu(e, item, playerId)}
          playerId={playerId}
          isDM={isDM}
          source="grid"
        />
      ))}
    </div>
  );
}