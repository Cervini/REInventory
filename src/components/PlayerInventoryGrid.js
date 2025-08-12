import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

export default function PlayerInventoryGrid({ items, gridWidth, gridHeight, containerId, onContextMenu, playerId, setGridRef, cellSize }) {
  
  const { setNodeRef, isOver } = useDroppable({ id: `${playerId}|${containerId}|grid` });

  const combinedRef = (node) => {
      setNodeRef(node);
      if (setGridRef) {
        setGridRef(node);
      }
    };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
    gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
    aspectRatio: `${gridWidth} / ${gridHeight}`,
    gap: '1px',
  };

  return (
    <div
      ref={combinedRef}
      style={gridStyle}
      className={`relative w-full bg-background/50 rounded-lg border border-accent/10 shadow-inner transition-colors duration-200 ${isOver ? 'bg-accent/10' : ''}`}
    >
      <div className="absolute inset-0 grid" style={gridStyle}>
        {Array.from({ length: gridWidth * gridHeight }).map((_, index) => (
          <div key={index} className="bg-surface/30 rounded-sm"></div>
        ))}
      </div>
      
      {items?.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted pointer-events-none z-10">
          <p className="font-fantasy italic text-lg">Inventory is empty.</p>
        </div>
      )}
      
      {/* The inventory items will render on top of the background grid */}
      {items?.map(item => (
        <InventoryItem
          key={item.id}
          item={item}
          containerId={containerId}
          onContextMenu={(e, item, source) => onContextMenu(e, item, playerId, source, containerId)}
          playerId={playerId}
          source="grid"
          cellSize={cellSize}
        />
      ))}
    </div>
  );
}