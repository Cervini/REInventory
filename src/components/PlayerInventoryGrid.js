import React from 'react';
// 1. We now only need useDroppable from dnd-kit
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

export default function PlayerInventoryGrid({ campaignId, playerId, items, onContextMenu, setGridRef, isDM, gridWidth, gridHeight }) {
  
  // Droppable zone, identified by the playerId
  const { setNodeRef, isOver } = useDroppable({ id: playerId });

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
    <div
      ref={combinedRef}
      style={gridStyle}
      className={`w-full h-auto grid bg-background/50 rounded-lg relative border border-accent/10 shadow-inner transition-colors duration-200 ${isOver ? 'bg-accent/10' : ''}`}
    >
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted pointer-events-none">
          <p className="font-fantasy italic text-lg">Inventory is empty.</p>
        </div>
      )}

      {Array.from({ length: gridWidth * gridHeight }).map((_, index) => (
        <div key={index} className="bg-surface/30 rounded-sm"></div>
      ))}
      
      {items.map(item => (
        <InventoryItem
          key={item.id}
          item={item}
          onContextMenu={(e, item, source) => onContextMenu(e, item, playerId, source)}
          playerId={playerId}
          isDM={isDM}
          source="grid"
        />
      ))}
    </div>
  );
}