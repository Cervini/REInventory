import React, { useState, useRef, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';

const initialItems = [
  { id: 1, name: 'Health Potion', x: 0, y: 0, w: 1, h: 2, color: 'bg-red-500' },
  { id: 2, name: 'Mana Potion', x: 1, y: 0, w: 1, h: 2, color: 'bg-blue-500' },
  { id: 3, name: 'Throwing Dagger', x: 0, y: 2, w: 1, h: 3, color: 'bg-gray-400' },
  { id: 4, name: 'Gold Coins', x: 2, y: 0, w: 1, h: 1, color: 'bg-yellow-400' },
  { id: 5, name: 'Bedroll', x: 3, y: 0, w: 2, h: 3, color: 'bg-green-600' },
  { id: 6, name: 'Mysterious Grimoire', x: 2, y: 3, w: 2, h: 2, color: 'bg-purple-600' },
];
const GRID_WIDTH = 12;
const GRID_HEIGHT = 9;

export default function InventoryGrid() {
  const [items, setItems] = useState(initialItems);
  const gridRef = useRef(null);
  const cellSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (gridRef.current) {
      const gridWidth = gridRef.current.offsetWidth;
      const gridHeight = gridRef.current.offsetHeight;
      cellSize.current = {
        width: gridWidth / GRID_WIDTH,
        height: gridHeight / GRID_HEIGHT,
      };
    }
  }, []); //`[]` => this effect runs only once after the component mounts

  const gridStyle = {
    gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
    gap: '1px',
  };

  // Drag handler logic
  function handleDragEnd(event) {
    const { active, delta } = event;

    // Find the item that was dragged
    const currentItem = items.find(item => item.id === active.id);
    if (!currentItem) return;

    // Calculate how many grid cells the item was dragged
    const colChange = Math.round(delta.x / cellSize.current.width);
    const rowChange = Math.round(delta.y / cellSize.current.height);

    // Calculate the new potential coordinates
    const newX = currentItem.x + colChange;
    const newY = currentItem.y + rowChange;

    console.log(`Item ${active.id} moved from (${currentItem.x}, ${currentItem.y}) to a new potential spot at (${newX}, ${newY})`);

    // Update the state
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative p-4">
        {/* We attach the ref to the background grid to measure it */}
        <div ref={gridRef} className="grid bg-gray-700" style={gridStyle}>
          {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, index) => (
            <div key={index} className="bg-gray-800/50 aspect-square"></div>
          ))}
        </div>

        <div className="absolute top-4 left-4 right-4 bottom-4 grid" style={gridStyle}>
          {items.map(item => (
            <InventoryItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}