import React, { useRef, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import InventoryItem from './InventoryItem';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 10;

function outOfBounds(X, Y, item) {
    if (X<0 || X>GRID_WIDTH || Y<0 || Y>GRID_HEIGHT) return true;
    if(X+item.w>GRID_WIDTH || Y+item.h>GRID_HEIGHT) return true;
    return false;
}

function occupiedTiles(X, Y, W, H) {
    let set = new Set();
    for(let i=0; i<W; i++) for(let j=0; j<H; j++) set.add(`${X + i},${Y + j}`);
    return set;
}

function onOtherItem(X, Y, activeItem, passiveItem) {
    let set1 = occupiedTiles(X, Y, activeItem.w, activeItem.h);
    let set2 = occupiedTiles(passiveItem.x, passiveItem.y, passiveItem.w, passiveItem.h);
    for (const tile of set1) { if (set2.has(tile)) return true; }
    return false;
}

export default function PlayerInventoryGrid({ campaignId, playerId, items, onUpdateItems, onContextMenu }) {
  const gridRef = useRef(null);
  const cellSize = useRef({ width: 0, height: 0 });

  // This useEffect now correctly belongs to a single grid
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;
    const resizeObserver = new ResizeObserver(() => {
      if (gridElement) {
        cellSize.current = {
          width: gridElement.offsetWidth / GRID_WIDTH,
          height: gridElement.offsetHeight / GRID_HEIGHT,
        };
      }
    });
    resizeObserver.observe(gridElement);
    return () => resizeObserver.disconnect();
  }, []);

  async function handleDragEnd(event) {
    const { active, delta } = event;

    const currentItem = items.find(item => item.id === active.id);
    if (!currentItem) return;

    const newX = Math.round((currentItem.x * cellSize.current.width + delta.x) / cellSize.current.width);
    const newY = Math.round((currentItem.y * cellSize.current.height + delta.y) / cellSize.current.height);

    if (outOfBounds(newX, newY, currentItem)) return;

    const isColliding = items.some(otherItem => {
      if (otherItem.id === active.id) return false;
      return onOtherItem(newX, newY, currentItem, otherItem);
    });

    if (isColliding) return;

    const newItems = items.map(item => 
      item.id === active.id ? { ...item, x: newX, y: newY } : item
    );

    // Call parent to update state for a snappy UI
    onUpdateItems(playerId, newItems);

    // Update the database
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, { items: newItems });
  }

  const gridStyle = {
    gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
    aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
    gap: '1px',
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      <div
        ref={gridRef}
        style={gridStyle}
        className="w-full h-auto grid bg-gray-700 rounded-lg"
      >
        {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, index) => (
          <div key={index} className="bg-gray-800/50 rounded-sm"></div>
        ))}
        
        {items.map(item => (
          <InventoryItem
            key={item.id}
            item={item}
            onContextMenu={(e, item) => onContextMenu(e, item, playerId)}
          />
        ))}
      </div>
    </DndContext>
  );
}