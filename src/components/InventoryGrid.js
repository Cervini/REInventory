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
const GRID_HEIGHT = 6;

function outOfBounds(X, Y, item) {
  // Check if cooridnates are inside of grid
  // if false item is inside borders
  if (X<0 || X>GRID_WIDTH || Y<0 || Y>GRID_HEIGHT)
    return true;
  else
    if(X+item.w>GRID_WIDTH || Y+item.h>GRID_HEIGHT)
      return true;
    else
      return false;
}

function occupiedTiles(X, Y, W, H) {
  let set = new Set();
  for(let i=0; i<W; i++)
    for(let j=0; j<H; j++)
      set.add(`${X + i},${Y + j}`);
    return set;
}

function onOtherItem(X, Y, activeItem, passiveItem) {
  //check top left
  let set1 = occupiedTiles(X, Y, activeItem.w, activeItem.h);
  let set2 = occupiedTiles(passiveItem.x, passiveItem.y, passiveItem.w, passiveItem.h);
  // Iterate over the first set
  for (const tile of set1) {
    if (set2.has(tile)) {
      return true; // Found a common tile -> overlap.
    }
  }
  return false;
}

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

    // get the item
    const currentItem = items.find(item => item.id === active.id);
    if (!currentItem) return;

    // calculate top left corner coordinates
    const draggedItemLeft = (currentItem.x * cellSize.current.width) + delta.x;
    const draggedItemTop = (currentItem.y * cellSize.current.height) + delta.y;

    const newX = Math.round(draggedItemLeft / cellSize.current.width);
    const newY = Math.round(draggedItemTop / cellSize.current.height);

    // check if out of bounds
    if (outOfBounds(newX, newY, currentItem))
      return;

    // check if items overlap
    const isColliding = items.some(otherItem => {
      // We only care about OTHER items, not the one we are dragging
      if (otherItem.id === active.id) {
        return false;
      }
      // Use your helper function to check for overlap
      return onOtherItem(newX, newY, currentItem, otherItem);
    });

    if (isColliding) {
      return; // Stop if a collision is detected
    }

    // Update the state
    setItems((prevItems) => {
      // Create a new array by mapping over the previous items
      return prevItems.map(item => {
        // Find the item that was dragged
        if (item.id === active.id) {
          // Return a new object for this item with the updated coordinates
          return {
            ...item,
            x: newX,
            y: newY,
          };
        }
        // For all other items, return them as they were
        return item;
      });
    });
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

