import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, collection, query, where, documentId, getDocs, writeBatch } from "firebase/firestore";
import { db } from '../firebase';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin  } from '@dnd-kit/core';
import { restrictToParentElement, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { getGridHeight, getGridWidth } from './PlayerInventoryGrid';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import SplitStack from './SplitStack';
import Spinner from './Spinner';

export default function InventoryGrid({ campaignId, user }) {
  const [inventories, setInventories] = useState({});
  const [campaign, setCampaign] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: null,
    item: null,
    playerId: null, // We now need to know which player's item was clicked
  });
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [itemToEdit, setItemToEdit] = useState(null);
  const [splittingItem, setSplittingItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const gridRefs = useRef({});

  function outOfBounds(X, Y, item) {
      if (X<0 || X>getGridWidth() || Y<0 || Y>getGridHeight()) return true;
      if(X+item.w>getGridWidth() || Y+item.h>getGridHeight()) return true;
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

  function findFirstAvailableSlot(items, newItem) {
    const GRID_WIDTH = 20; // Make sure these match your constants
    const GRID_HEIGHT = 10;

    for (let y = 0; y <= GRID_HEIGHT - newItem.h; y++) {
      for (let x = 0; x <= GRID_WIDTH - newItem.w; x++) {
        // Check for collisions at this (x,y) spot
        const isColliding = items.some(existingItem => 
          onOtherItem(x, y, newItem, existingItem)
        );
        if (!isColliding) {
          // Found a free spot
          return { x, y };
        }
      }
    }
    return null; // No available spot found
  }

  // Data fetching logic remains the same
  useEffect(() => {
    if (!campaignId || !user) return;

    setIsLoading(true); // Set loading to true when fetching starts

    const fetchData = async () => {
      const campaignDocRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignDocRef);

      if (!campaignSnap.exists()) {
        console.error("Campaign not found!");
        return;
      }
      
      const campaignData = campaignSnap.data();
      setCampaign(campaignData);
      
      // Fetch the profiles for all players in the campaign
      if (campaignData.players && campaignData.players.length > 0) {
        const profilesQuery = query(collection(db, "users"), where(documentId(), "in", campaignData.players));
        const querySnapshot = await getDocs(profilesQuery);
        const profiles = {};
        querySnapshot.forEach((doc) => {
          profiles[doc.id] = doc.data();
        });
        setPlayerProfiles(profiles);
      }

      const isDM = campaignData.dmId === user.uid;
      if (isDM) {
        const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
        const unsubscribe = onSnapshot(inventoriesColRef, (snapshot) => {
          const allInventories = {};
          snapshot.forEach(doc => { allInventories[doc.id] = doc.data().items || []; });
          setInventories(allInventories);
        });
        return unsubscribe;
      } else {
        const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
        const unsubscribe = onSnapshot(inventoryDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setInventories({ [user.uid]: docSnap.data().items || [] });
          }
        });
        return unsubscribe;
      }
    };

    const unsubscribePromise = fetchData().finally(() => {
      setIsLoading(false); // 4. Set loading to false when all fetching is done
    });


    return () => { unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe()); };
  }, [campaignId, user]);

  const handleContextMenu = (event, item, playerId) => {
    event.preventDefault();
    
    // Pass the item and playerId directly when defining the onClick actions
    const availableActions = [{ label: 'Edit Item', onClick: () => handleStartEdit(item, playerId) }];
    if (item.stackable && item.quantity > 1) {
      availableActions.push({ label: 'Split Stack', onClick: () => handleStartSplit(item, playerId) });
    }
    availableActions.push({ label: 'Delete Item', onClick: () => handleDeleteItem(item, playerId) });

    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      item: item,
      playerId: playerId,
      actions: availableActions,
    });
  };

  const handleStartSplit = (item, playerId) => {
    setSplittingItem({ item, playerId });
  };

  const handleDeleteItem = async (item, playerId) => {
    if (!item || !playerId) return;

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, {
      items: arrayRemove(item) // Use the item passed directly to the function
    });
  };
  
  const handleStartEdit = (item, playerId) => {
    if (!item) return;
    setItemToEdit({ item, playerId });
    setShowAddItem(true);
  };

  const handleAddItem = async (itemData, targetPlayerId) => {
    const finalPlayerId = itemToEdit ? itemToEdit.playerId : targetPlayerId;
    if (!campaignId || !finalPlayerId) return;

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', finalPlayerId);
    const currentItems = inventories[finalPlayerId] || [];
    let newItems;

    if (itemToEdit) {
      newItems = currentItems.map(i =>
        (i.id === itemToEdit.item.id ? { ...itemToEdit.item, ...itemData } : i)
      );
    } else {
      let merged = false;
      if (itemData.stackable) {
        const existingItemIndex = currentItems.findIndex(item =>
          item.stackable && item.name.toLowerCase() === itemData.name.toLowerCase()
        );
        
        if (existingItemIndex !== -1) {
          newItems = [...currentItems];
          const existingItem = newItems[existingItemIndex];
          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + itemData.quantity,
          };
          merged = true; // Mark that we merged with an existing stack
        }
      }
      
      // If no merge happened, we need to find a spot for the new item
      if (!merged) {
        const position = findFirstAvailableSlot(currentItems, itemData);

        if (position === null) {
          toast.error("Inventory is full. Cannot add new item.");
          return; // Exit if no space is found
        }
        
        const finalNewItem = { ...itemData, x: position.x, y: position.y };
        newItems = [...currentItems, finalNewItem];
      }
    }

    setInventories(prev => ({ ...prev, [finalPlayerId]: newItems }));
    await updateDoc(inventoryDocRef, { items: newItems });
    setItemToEdit(null);
    setShowAddItem(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId).then(() => {
      setIsCopied(true);
      // Reset the button text after 2 seconds
      setTimeout(() => setIsCopied(false), 2000); 
    });
  };

  const handleSplitStack = async (splitAmount) => {
    if (!splittingItem) return;

    const { item: originalItem, playerId } = splittingItem;
    const amount = parseInt(splitAmount, 10);

    if (isNaN(amount) || amount <= 0 || amount >= originalItem.quantity) return;

    const updatedOriginalItem = {
      ...originalItem,
      quantity: originalItem.quantity - amount,
    };

    // Before creating the new item, check if there's space for it
    const tempNewItem = { ...originalItem, w: originalItem.w, h: originalItem.h };
    const position = findFirstAvailableSlot(inventories[playerId] || [], tempNewItem);

    if (position === null) {
      toast.error("No space in inventory to split the stack!");
      return;
    }

    // Now create the new item with the found position
    const newItem = {
      ...originalItem,
      id: crypto.randomUUID(),
      quantity: amount,
      x: position.x,
      y: position.y,
    };

    const currentItems = inventories[playerId] || [];
    const newItems = currentItems.map(i => 
      (i.id === originalItem.id ? updatedOriginalItem : i)
    );
    newItems.push(newItem);

    setInventories(prev => ({ ...prev, [playerId]: newItems }));
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, { items: newItems });
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const ownerId = active.data.current?.ownerId;
    const item = active.data.current?.item;

    // Find the specific grid element the drag started in
    const gridElement = gridRefs.current[ownerId];

    // Guard clause in case something goes wrong
    if (!item || !gridElement) {
      setActiveItem(null);
      return;
    }

    // Calculate the cell size of that specific grid on the fly
    const cellSize = {
      width: gridElement.offsetWidth / getGridWidth(),
      height: gridElement.offsetHeight / getGridHeight(),
    };

    // Set the active item for the DragOverlay with our calculated dimensions
    setActiveItem({
      item: item,
      dimensions: {
        width: item.w * cellSize.width,
        height: item.h * cellSize.height,
      },
    });
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  const handleDragEnd = async (event) => {
    setActiveItem(null);
    const { active, over, delta } = event;
    const startPlayerId = active.data.current?.ownerId;
    const endPlayerId = over?.id;
    const item = active.data.current?.item;

    if (!endPlayerId || !startPlayerId || !item) return;

    // --- Scenario 1: Repositioning item (No changes here) ---
    if (startPlayerId === endPlayerId) {
      const gridElement = gridRefs.current[startPlayerId];
      if (!gridElement) return;
      const cellSize = {
        width: gridElement.offsetWidth / 20, // Using constants directly
        height: gridElement.offsetHeight / 10,
      };
      const newX = Math.round((item.x * cellSize.width + delta.x) / cellSize.width);
      const newY = Math.round((item.y * cellSize.height + delta.y) / cellSize.height);
      const currentItems = inventories[startPlayerId] || [];
      if (outOfBounds(newX, newY, item)) return;
      const isColliding = currentItems.some(other => (other.id !== item.id) && onOtherItem(newX, newY, item, other));
      if (isColliding) return;
      const newItems = currentItems.map(i => (i.id === item.id ? { ...i, x: newX, y: newY } : i));
      setInventories(prev => ({ ...prev, [startPlayerId]: newItems }));
      const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', startPlayerId);
      await updateDoc(inventoryDocRef, { items: newItems });
    }
    // --- Scenario 2: Transferring item (All new logic) ---
    else {
      const startItems = inventories[startPlayerId] || [];
      const endItems = inventories[endPlayerId] || [];
      const endGridElement = gridRefs.current[endPlayerId];
      if (!endGridElement) return;

      // Calculate the cell size of the DESTINATION grid
      const endCellSize = {
        width: endGridElement.offsetWidth / 20,
        height: endGridElement.offsetHeight / 10,
      };
      
      // Calculate where the cursor dropped relative to the destination grid
      const endGridRect = endGridElement.getBoundingClientRect();
      const dropX = active.rect.current.translated.left - endGridRect.left;
      const dropY = active.rect.current.translated.top - endGridRect.top;
      
      // Convert pixel drop position to grid coordinates
      let newX = Math.round(dropX / endCellSize.width);
      let newY = Math.round(dropY / endCellSize.height);
      
      let finalPosition = { x: newX, y: newY };
      
      // Check if this drop position is valid
      if (outOfBounds(newX, newY, item) || endItems.some(other => onOtherItem(newX, newY, item, other))) {
        // If not, find the first available slot
        finalPosition = findFirstAvailableSlot(endItems, item);
      }

      // If there's no room at all, cancel the transfer
      if (finalPosition === null) {
        toast.error("Destination inventory is full!");
        return;
      }

      // Create the new item with its final position
      const newItem = { ...item, x: finalPosition.x, y: finalPosition.y };
      
      const newStartItems = startItems.filter(i => i.id !== item.id);
      const newEndItems = [...endItems, newItem];

      setInventories(prev => ({
        ...prev,
        [startPlayerId]: newStartItems,
        [endPlayerId]: newEndItems,
      }));

      const batch = writeBatch(db);
      const startInventoryRef = doc(db, 'campaigns', campaignId, 'inventories', startPlayerId);
      const endInventoryRef = doc(db, 'campaigns', campaignId, 'inventories', endPlayerId);
      batch.update(startInventoryRef, { items: newStartItems });
      batch.update(endInventoryRef, { items: newEndItems });
      await batch.commit();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require mouse to move 8px before a drag starts
      },
    })
  );

  if (isLoading) {
    return <Spinner />;
  }

  if (!isLoading && Object.keys(inventories).length === 0) {
    return (
      <div className="text-center text-gray-400 mt-16 p-4">
        <h2 className="text-2xl font-bold text-white">This Campaign Is Empty</h2>
        <p className="mt-2">No player inventories have been created here yet.</p>
        <p>As the DM, use the "Add Item" button to create an inventory for yourself to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center flex-grow">
      {splittingItem && (
        <SplitStack
          item={splittingItem.item}
          onClose={() => setSplittingItem(null)}
          onSplit={(splitAmount) => {
            handleSplitStack(splitAmount);
            setSplittingItem(null); // Close modal after splitting
          }}
        />
      )}
      {showAddItem && (
        <AddItem 
          onAddItem={handleAddItem} 
          onClose={() => {
            setShowAddItem(false);
            setItemToEdit(null); // Reset edit state on close
          }} 
          players={Object.keys(inventories)}
          dmId={campaign?.dmId}
          isDM={campaign?.dmId === user?.uid}
          playerProfiles={playerProfiles}
          itemToEdit={itemToEdit} // Pass the item to be edited
        />
      )}
      {/** Context menu visibility */}
      {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenu.actions}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* Header section */}
      <div className="bg-gray-800 p-2 rounded-md mb-4 flex items-center justify-between w-full max-w-4xl">
        <div className="flex items-center space-x-4">
          <span className="text-gray-400 font-mono text-sm">
            Campaign Code: <span className="font-bold text-gray-200">{campaignId}</span>
          </span>
          <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded">
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button onClick={() => setShowAddItem(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded">
          Add Item
        </button>
      </div>

      {/* Main content area now renders the new component in a loop */}
      {(() => {
        // if the current user is the DM
        const isDM = campaign?.dmId === user?.uid;
        const dndModifiers = isDM ? [restrictToWindowEdges] : [restrictToParentElement];

        return (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={dndModifiers}
            collisionDetection={pointerWithin}
          >
            <div className="w-full flex-grow overflow-auto p-4 space-y-8">
              {Object.entries(inventories).map(([playerId, items]) => (
                <div key={playerId}>
                  <h2 className="text-xl font-bold text-white mb-2">
                    Inventory for: {playerProfiles[playerId]?.displayName || playerId}
                  </h2>
                  
                  <PlayerInventoryGrid
                    campaignId={campaignId}
                    playerId={playerId}
                    items={items}
                    isDM={campaign?.dmId === user?.uid}
                    onContextMenu={handleContextMenu}
                    setGridRef={(node) => (gridRefs.current[playerId] = node)}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>
            {activeItem ? (
              <div 
                style={{
                  width: activeItem.dimensions.width,
                  height: activeItem.dimensions.height,
                }} 
                className={`${activeItem.item.color} rounded-lg text-white font-bold p-1 text-center text-xs sm:text-sm flex items-center justify-center shadow-lg`}
              >
                {activeItem.item.name}
                {activeItem.item.stackable && activeItem.item.quantity > 1 && (
                  <span className="absolute bottom-0 right-1 text-lg font-black" style={{ WebkitTextStroke: '1px black' }}>
                    {activeItem.item.quantity}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>
          </DndContext>
        );
      })()}
    </div>
  );
}