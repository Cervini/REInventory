import React, { useState, useRef, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import InventoryItem from './InventoryItem';
import { doc, onSnapshot, updateDoc, collection } from "firebase/firestore";
import { db } from '../firebase';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

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

export default function InventoryGrid({ campaignId, user }) {
  const [items, setItems] = useState([]);
  const gridRef = useRef(null);
  const cellSize = useRef({ width: 0, height: 0 });
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // Can't have inventory without campaign or user
    if (!campaignId || !user) return;

    // Points to the document with the user's ID within the 'inventories' sub-collection
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
    
    const unsubscribe = onSnapshot(inventoryDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setItems(data.items || []);
      } else {
        console.log("User inventory document not found in Firebase.");
        setItems([]); // Clear items if doc doesn't exist
      }
    });

    return () => unsubscribe();
  }, [campaignId, user]); // Re-run this effect if the campaignId changes (or the user)

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
  async function handleDragEnd(event) {
    const { active, delta } = event;

    const currentItem = items.find(item => item.id === active.id);
    if (!currentItem) return;

    const draggedItemLeft = (currentItem.x * cellSize.current.width) + delta.x;
    const draggedItemTop = (currentItem.y * cellSize.current.height) + delta.y;
    const newX = Math.round(draggedItemLeft / cellSize.current.width);
    const newY = Math.round(draggedItemTop / cellSize.current.height);

    if (outOfBounds(newX, newY, currentItem)) return;

    const isColliding = items.some(otherItem => {
      if (otherItem.id === active.id) { return false; }
      return onOtherItem(newX, newY, currentItem, otherItem);
    });

    if (isColliding) { return; }

    // 1. Create the new array of items first.
    const newItems = items.map(item => {
      if (item.id === active.id) {
        return { ...item, x: newX, y: newY };
      }
      return item;
    });

    // 2. Update the local state immediately for a snappy feel.
    setItems(newItems);

    // 3. Save the new array to the database.
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
    await updateDoc(inventoryDocRef, { items: newItems });

  }

  // 4. Campaing id copy handler
  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="w-full flex flex-col items-center flex-grow">
      <div className="bg-gray-800 p-2 rounded-md mb-4 flex items-center space-x-4">
        <span className="text-gray-400 font-mono text-sm">
          Campaign Code: <span className="font-bold text-gray-200">{campaignId}</span>
        </span>
        <button
          onClick={handleCopy}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div
            ref={gridRef}
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
              aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
              gap: '1px',
            }}
            className="w-full h-auto grid bg-gray-700 rounded-lg"
          >
            {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, index) => (
              <div key={index} className="bg-gray-800/50 rounded-sm"></div>
            ))}
            {items.map(item => (
              <InventoryItem key={item.id} item={item} />
            ))}
          </div>
      </DndContext>
    </div>
  );
}