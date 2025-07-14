import React, { useState, useRef, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from '../firebase';
import InventoryItem from './InventoryItem';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

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
  // states
  const [items, setItems] = useState([]);
  const [isCopied, setIsCopied] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: null, // { x, y }
    item: null,
  });
  const [gridRect, setGridRect] = useState(null);
  // references
  const gridRef = useRef(null);
  const cellSize = useRef({ width: 0, height: 0 });

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

    useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const resizeObserver = new ResizeObserver(() => {
      if (gridElement) {
        const rect = gridElement.getBoundingClientRect();
        // 3. Update both the cell size and the grid rectangle on resize
        setGridRect(rect); 
        cellSize.current = {
          width: rect.width / GRID_WIDTH,
          height: rect.height / GRID_HEIGHT,
        };
      }
    });

    resizeObserver.observe(gridElement);
    return () => resizeObserver.disconnect();
  }, []);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleAddItem = async (newItem) => {
    if (!campaignId || !user) return;
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
    await updateDoc(inventoryDocRef, {
      items: arrayUnion(newItem)
    });
  };

  const handleContextMenu = (event, item) => {
    event.preventDefault(); // Prevent native browser menu
    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      item: item,
    });
  };

  const handleDeleteItem = async () => {
    if (!contextMenu.item) return;

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
    // Use arrayRemove to pull the exact item object from the array
    await updateDoc(inventoryDocRef, {
      items: arrayRemove(contextMenu.item)
    });
  };

  // Define the actions for the context menu
  const contextMenuActions = [
    { label: 'Delete Item', onClick: handleDeleteItem },
    // Add more actions like "Edit" here later
  ];

  return (
    <div className="w-full flex flex-col items-center flex-grow">
        {/* conditionally render AddItem form as a modal */}
        {showAddItem && <AddItem onAddItem={handleAddItem} onClose={() => setShowAddItem(false)} />}
        {/* conditionally render ContextMenu */}
        {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenuActions}
          onClose={() => setContextMenu({ visible: false, position: null, item: null })}
        />
        )}
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
        <button onClick={() => setShowAddItem(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded">
          Add Item
        </button>
      </div>

      <DndContext 
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
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
              <InventoryItem 
                key={item.id} 
                item={item} 
                onContextMenu={handleContextMenu}/>
            ))}
          </div>
      </DndContext>
    </div>
  );
}