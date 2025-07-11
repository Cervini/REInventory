import React, { useState } from 'react';
import { InventoryItem } from './InventoryItem';

// --- Mock Data ---
const initialItems = [
  { id: 1, name: 'Health Potion', x: 0, y: 0, w: 1, h: 2, color: 'bg-red-500' },
  { id: 2, name: 'Mana Potion', x: 1, y: 0, w: 1, h: 2, color: 'bg-blue-500' },
  { id: 3, name: 'Throwing Dagger', x: 0, y: 2, w: 1, h: 3, color: 'bg-gray-400' },
  { id: 4, name: 'Gold Coins', x: 2, y: 0, w: 1, h: 1, color: 'bg-yellow-400' },
  { id: 5, name: 'Bedroll', x: 3, y: 0, w: 2, h: 3, color: 'bg-green-600' },
  { id: 6, name: 'Mysterious Grimoire', x: 2, y: 3, w: 2, h: 2, color: 'bg-purple-600' },
];

// --- Configuration ---
const GRID_WIDTH = 12;
const GRID_HEIGHT = 6;

/**
 * The main inventory grid component.
 * We have two separate grids: one for the background and one for the items, layered on top.
 */
export function InventoryGrid() {
  const [items, setItems] = useState(initialItems);

  // This style object is used for BOTH grids to make sure they align perfectly.
  const gridStyle = {
    gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
    gap: '1px',
  };

  return (
    // The outer container adds the padding.
    <div className="relative p-4">
      {/* 1. The Background Grid */}
      <div className="grid bg-gray-700" style={gridStyle}>
        {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, index) => (
          <div key={index} className="bg-gray-800/50 aspect-square"></div>
        ))}
      </div>

      {/* 2. The Item Grid (Overlay) */}
      {/* This is positioned absolutely to sit directly on top of the background grid. */}
      <div className="absolute top-4 left-4 right-4 bottom-4 grid" style={gridStyle}>
        {items.map(item => (
          <InventoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}