import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { doc, onSnapshot, updateDoc, collection, query, where, writeBatch } from "firebase/firestore";
import { db } from '../firebase';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { restrictToParentElement, restrictToWindowEdges } from '@dnd-kit/modifiers';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import { findFirstAvailableSlot, onOtherItem, outOfBounds } from '../utils/gridUtils'; // Import from utils
import { useCampaignData } from '../hooks/useCampaignData'; // Import the custom hook
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import SplitStack from './SplitStack';
import Spinner from './Spinner';
import ItemTray from './ItemTray';
import InventorySettings from './InventorySettings';
import { getColorForItemType } from '../utils/itemUtils';
import AddFromCompendium from './AddFromCompendium';
import StartTrade from './StartTrade';
import TradeNotifications from './TradeNotifications'
import Trade from './Trade';
import { usePlayerProfiles } from '../hooks/usePlayerProfiles';

export default function InventoryGrid({ campaignId, user, userProfile, isTrading, setIsTrading }) {
  
  const { inventories, setInventories, campaign, isLoading: inventoriesLoading } = useCampaignData(campaignId, user);
  const { playerProfiles, isLoading: profilesLoading } = usePlayerProfiles(campaignId);
  
  const isLoading = inventoriesLoading || profilesLoading; // Combine loading states

  // State for UI interactions remains here
  const [showAddItem, setShowAddItem] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, item: null, playerId: null, actions: [] });
  const [itemToEdit, setItemToEdit] = useState(null);
  const [splittingItem, setSplittingItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [openInventories, setOpenInventories] = useState({});
  const [editingInventory, setEditingInventory] = useState(null);
  const [cellSizes, setCellSizes] = useState({});
  const [showCompendium, setShowCompendium] = useState(false);
  const [activeTrade, setActiveTrade] = useState(null);
  
  
  const gridRefs = useRef({});

  // Listen for active trades
  useEffect(() => {
    if (!user || !campaignId) return;

    const tradesRef = collection(db, 'trades');
    // Query for trades where the user is either Player A OR Player B
    const q = query(
      tradesRef,
      where('campaignId', '==', campaignId),
      where('players', 'array-contains', user.uid), // You'll need to add a 'players' field to your trade docs
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // If an active trade is found, open the modal
        const tradeDoc = snapshot.docs[0];
        setActiveTrade({ id: tradeDoc.id, ...tradeDoc.data() });
      } else {
        setActiveTrade(null);
      }
    });

    return () => unsubscribe();
  }, [campaignId, user]);

  useEffect(() => {
        const observers = [];
        Object.entries(gridRefs.current).forEach(([playerId, gridElement]) => {
            if (gridElement && openInventories[playerId]) { // Only observe visible grids
                const measure = () => {
                    const inventory = inventories[playerId];
                    if (inventory) {
                        setCellSizes(prev => ({
                            ...prev,
                            [playerId]: {
                                width: gridElement.offsetWidth / inventory.gridWidth,
                                height: gridElement.offsetHeight / inventory.gridHeight,
                            }
                        }));
                    }
                };
                
                const resizeObserver = new ResizeObserver(measure);
                resizeObserver.observe(gridElement);
                measure(); // Initial measurement
                observers.push({ element: gridElement, observer: resizeObserver });
            }
        });

        return () => {
            observers.forEach(({ element, observer }) => {
                if (element) {
                    observer.unobserve(element);
                }
            });
        };
    }, [inventories, openInventories]);

  useEffect(() => {
    // Only run this logic if we have the necessary data
    if (!user || !inventories[user.uid] || isLoading) return;

    // Use a functional update to safely access the latest state
    setInventories(prevInventories => {
      const myCurrentInventory = prevInventories[user.uid];
      const myGridWidth = myCurrentInventory.gridWidth;
      const myGridHeight = myCurrentInventory.gridHeight;

      const itemsToMove = [];
      const itemsToKeep = [];

      (myCurrentInventory.gridItems || []).forEach(item => {
        // Use the helper function to check if the item is out of bounds
        if (outOfBounds(item.x, item.y, item, myGridWidth, myGridHeight)) {
          const { x, y, ...trayItem } = item; // Strip coordinates for the tray
          itemsToMove.push(trayItem);
        } else {
          itemsToKeep.push(item);
        }
      });

      // If we found items to move, update the state and Firestore
      if (itemsToMove.length > 0) {
        const newTrayItems = [...(myCurrentInventory.trayItems || []), ...itemsToMove];
        const newGridItems = itemsToKeep;

        const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
        updateDoc(inventoryDocRef, {
          gridItems: newGridItems,
          trayItems: newTrayItems,
        }).then(() => {
          toast.success(`${itemsToMove.length} item(s) moved to your tray.`);
        });

        // Return the new state for an instant UI update
        return {
          ...prevInventories,
          [user.uid]: {
            ...myCurrentInventory,
            gridItems: newGridItems,
            trayItems: newTrayItems,
          },
        };
      }
      
      // If no items were moved, return the state unchanged
      return prevInventories;
    });
  }, [inventories, user, isLoading, campaignId, setInventories]); // Add all stable dependencies

  const handleContextMenu = (event, item, playerId, source) => {
    event.preventDefault();
    
    const isDM = campaign?.dmId === user?.uid;
    const isDMInventory = campaign?.dmId === playerId;
    const availableActions = [];

    // --- Build the "Send to Player" submenu if the user is the DM ---
    if (isDM) {
      const otherPlayers = Object.keys(playerProfiles).filter(id => id !== playerId);
      if (otherPlayers.length > 0) {
        availableActions.push({
          label: 'Send to Player...',
          submenu: otherPlayers.map(targetId => ({
            label: playerProfiles[targetId]?.displayName || targetId,
            // Pass the item's source to the send function
            onClick: () => handleSendItem(item, source, playerId, targetId),
          })),
        });
      }
    }

    if (item.stackable && item.quantity > 1) {
      availableActions.push({ label: 'Split Stack', onClick: () => handleStartSplit(item, playerId) });
    }
    if (isDM && isDMInventory && source === 'tray') {
        availableActions.push({ label: 'Duplicate Item', onClick: () => handleDuplicateItem(item, playerId) });
    }
    availableActions.push({ 
      label: 'Edit Item', 
      onClick: () => handleStartEdit(item, playerId),
    });
    availableActions.push({
      label: 'Delete Item',
      onClick: () => handleDeleteItem(item, playerId, source),
    });

    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      actions: availableActions,
    });
  };

  const handleStartSplit = (item, playerId) => {
    setSplittingItem({ item, playerId });
  };

  const handleDeleteItem = async (item, playerId, source) => {
    if (!item || !playerId || !source) return;

    const inventoryDocRef = doc(db, "campaigns", campaignId, "inventories", playerId);
    const currentInventory = inventories[playerId] || { gridItems: [], trayItems: [] };
    
    let newGridItems = currentInventory.gridItems;
    let newTrayItems = currentInventory.trayItems;

    if (source === 'grid') {
      newGridItems = currentInventory.gridItems.filter(i => i.id !== item.id);
    } else if (source === 'tray') {
      newTrayItems = currentInventory.trayItems.filter(i => i.id !== item.id);
    }

    setInventories(prev => ({
      ...prev,
      [playerId]: {
        gridItems: newGridItems,
        trayItems: newTrayItems,
      }
    }));

    await updateDoc(inventoryDocRef, {
      gridItems: newGridItems,
      trayItems: newTrayItems,
    });
  };

  const handleStartEdit = (item, playerId) => {
    if (!item) return;
    setItemToEdit({ item, playerId });
    setShowAddItem(true);
  };

  const handleAddItem = async (itemData) => {
    const finalPlayerId = itemToEdit ? itemToEdit.playerId : user.uid;
    if (!campaignId || !finalPlayerId) return;

    const inventoryDocRef = doc(
      db,
      "campaigns",
      campaignId,
      "inventories",
      finalPlayerId
    );
    const currentInventory = inventories[finalPlayerId] || {
      gridItems: [],
      trayItems: [],
    };

    // --- EDIT LOGIC (Updates an item already on the grid) ---
    if (itemToEdit) {
      const newGridItems = currentInventory.gridItems.map((i) =>
        i.id === itemToEdit.item.id ? { ...itemToEdit.item, ...itemData } : i
      );
      setInventories((prev) => ({
        ...prev,
        [finalPlayerId]: { ...prev[finalPlayerId], gridItems: newGridItems },
      }));
      await updateDoc(inventoryDocRef, { gridItems: newGridItems });
    }
    // --- ADD LOGIC (Adds the new item to the TRAY) ---
    else {
      // Logic for merging with an existing stack (now checks the tray)
      if (itemData.stackable) {
        const existingItemIndex = currentInventory.trayItems.findIndex(
          (item) =>
            item.stackable &&
            item.name.toLowerCase() === itemData.name.toLowerCase()
        );

        if (existingItemIndex !== -1) {
          const newTrayItems = [...currentInventory.trayItems];
          const existingItem = newTrayItems[existingItemIndex];
          newTrayItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + itemData.quantity,
          };

          setInventories((prev) => ({
            ...prev,
            [finalPlayerId]: {
              ...prev[finalPlayerId],
              trayItems: newTrayItems,
            },
          }));
          await updateDoc(inventoryDocRef, { trayItems: newTrayItems });
          setItemToEdit(null);
          setShowAddItem(false);
          return; // Exit after merging
        }
      }

      // If not merging, add the new item to the trayItems array
      const newTrayItems = [...currentInventory.trayItems, itemData];
      setInventories(prev => ({ ...prev, [finalPlayerId]: { ...prev[finalPlayerId], trayItems: newTrayItems } }));
      await updateDoc(inventoryDocRef, { trayItems: newTrayItems });
    }

    setItemToEdit(null);
    setShowAddItem(false);
  };

  const handleSplitStack = async (splitAmount) => {
    if (!splittingItem) return;

    const { item: originalItem, playerId } = splittingItem;
    const amount = parseInt(splitAmount, 10);

    if (isNaN(amount) || amount <= 0 || amount >= originalItem.quantity) return;

    // 1. The original stack with its quantity reduced (remains on the grid)
    const updatedOriginalItem = {
      ...originalItem,
      quantity: originalItem.quantity - amount,
    };

    // 2. The new stack (goes to the tray, so no x/y needed)
    const { x, y, ...restOfItem } = originalItem;
    const newItemForTray = {
      ...restOfItem,
      id: crypto.randomUUID(),
      quantity: amount,
    };

    // 3. Update the arrays
    const currentInventory = inventories[playerId] || {
      gridItems: [],
      trayItems: [],
    };
    const newGridItems = currentInventory.gridItems.map((i) =>
      i.id === originalItem.id ? updatedOriginalItem : i
    );
    const newTrayItems = [...currentInventory.trayItems, newItemForTray];

    // 4. Update local state and Firestore
    setInventories((prev) => ({
      ...prev,
      [playerId]: { gridItems: newGridItems, trayItems: newTrayItems },
    }));

    const inventoryDocRef = doc(
      db,
      "campaigns",
      campaignId,
      "inventories",
      playerId
    );
    // Note: This updates both arrays at once.
    await updateDoc(inventoryDocRef, {
      gridItems: newGridItems,
      trayItems: newTrayItems,
    });
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const ownerId = active.data.current?.ownerId;
    const item = active.data.current?.item;
    const source = active.data.current?.source;

    if (!item) return;

    // If the item comes from the grid, calculate its size dynamically
    if (source === 'grid') {
      const gridElement = gridRefs.current[ownerId];
      if (!gridElement) return;

      const playerInventory = inventories[ownerId];
      const gridWidth = playerInventory?.gridWidth || 30;
      const gridHeight = playerInventory?.gridHeight || 10;
      
      const cellSize = {
        width: gridElement.offsetWidth / gridWidth,
        height: gridElement.offsetHeight / gridHeight,
      };

      setActiveItem({
        item: item,
        dimensions: {
          width: item.w * cellSize.width,
          height: item.h * cellSize.height,
        },
      });
    } 
    // If the item comes from the tray, use its fixed size
    else if (source === 'tray') {
      setActiveItem({
        item: item,
        dimensions: {
          width: 80, // w-20 in Tailwind is 5rem = 80px
          height: 80, // h-20 in Tailwind is 5rem = 80px
        },
      });
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  const handleDragEnd = async (event) => {
    setActiveItem(null);
    const { active, over, delta } = event;

    if (!over) return;

    const startSource = active.data.current?.source;
    const startPlayerId = active.data.current?.ownerId;
    const item = active.data.current?.item;
    
    const endDroppableId = over.id; 
    const endPlayerId = endDroppableId.toString().replace('-tray', '');
    const endDestination = endDroppableId.toString().includes('-tray') ? 'tray' : 'grid';

    if (!startPlayerId || !endPlayerId || !item) return;

    const startInventory = inventories[startPlayerId];
    const endInventory = inventories[endPlayerId];

    // --- Scenario 1: Dragging from GRID ---
    if (startSource === "grid") {
      // Grid -> Tray
      if (endDestination === "tray") {
        const newStartGridItems = startInventory.gridItems.filter(i => i.id !== item.id);
        const {x, y, ...trayItem} = item;
        const newEndTrayItems = [...endInventory.trayItems, trayItem];
        
        setInventories(prev => ({ ...prev, 
          [startPlayerId]: { ...prev[startPlayerId], gridItems: newStartGridItems },
          [endPlayerId]: { ...prev[endPlayerId], trayItems: newEndTrayItems }
        }));
        
        const batch = writeBatch(db);
        batch.update(doc(db, "campaigns", campaignId, "inventories", startPlayerId), { gridItems: newStartGridItems });
        batch.update(doc(db, "campaigns", campaignId, "inventories", endPlayerId), { trayItems: newEndTrayItems });
        await batch.commit();
      }
      // Grid -> Grid (Reposition or Transfer)
      else {
        // --- Scenario 1A: Repositioning item within the SAME grid ---
        if (startPlayerId === endPlayerId) {
          const gridElement = gridRefs.current[startPlayerId];
          if (!gridElement) return;

          const gridWidth = startInventory.gridWidth;
          const gridHeight = startInventory.gridHeight;
          const currentGridItems = startInventory.gridItems || [];

          const cellSize = {
            width: gridElement.offsetWidth / gridWidth,
            height: gridElement.offsetHeight / gridHeight,
          };

          const newX = Math.round((item.x * cellSize.width + delta.x) / cellSize.width);
          const newY = Math.round((item.y * cellSize.height + delta.y) / cellSize.height);

          if (outOfBounds(newX, newY, item, gridWidth, gridHeight)) return;
          const isColliding = currentGridItems.some(other => (other.id !== item.id) && onOtherItem(newX, newY, item, other));
          if (isColliding) return;
          
          const newGridItems = currentGridItems.map(i => (i.id === item.id ? { ...i, x: newX, y: newY } : i));
          
          setInventories(prev => ({ ...prev, [startPlayerId]: { ...prev[startPlayerId], gridItems: newGridItems } }));
          await updateDoc(doc(db, "campaigns", campaignId, "inventories", startPlayerId), { gridItems: newGridItems });
        }
        // --- Scenario 1B: Transferring item to a DIFFERENT grid ---
        else {
          const endGridWidth = endInventory.gridWidth;
          const endGridHeight = endInventory.gridHeight;
          const startGridItems = startInventory.gridItems || [];
          const endGridItems = endInventory.gridItems || [];
          const endGridElement = gridRefs.current[endPlayerId];
          if (!endGridElement) return;

          const endCellSize = {
            width: endGridElement.offsetWidth / endGridWidth,
            height: endGridElement.offsetHeight / endGridHeight,
          };
          
          const endGridRect = endGridElement.getBoundingClientRect();
          const dropX = active.rect.current.translated.left - endGridRect.left;
          const dropY = active.rect.current.translated.top - endGridRect.top;
          
          let newX = Math.round(dropX / endCellSize.width);
          let newY = Math.round(dropY / endCellSize.height);
          let finalPosition = { x: newX, y: newY };
          
          if (outOfBounds(newX, newY, item, endGridWidth, endGridHeight) || endGridItems.some(other => onOtherItem(newX, newY, item, other))) {
            finalPosition = findFirstAvailableSlot(endGridItems, item, endGridWidth, endGridHeight);
          }

          if (finalPosition === null) {
            toast.error("Destination inventory is full!");
            return;
          }

          const newItem = { ...item, x: finalPosition.x, y: finalPosition.y };
          const newStartGridItems = startGridItems.filter(i => i.id !== item.id);
          const newEndGridItems = [...endGridItems, newItem];

          setInventories(prev => ({
            ...prev,
            [startPlayerId]: { ...prev[startPlayerId], gridItems: newStartGridItems },
            [endPlayerId]: { ...prev[endPlayerId], gridItems: newEndGridItems },
          }));

          const batch = writeBatch(db);
          batch.update(doc(db, "campaigns", campaignId, "inventories", startPlayerId), { gridItems: newStartGridItems });
          batch.update(doc(db, "campaigns", campaignId, "inventories", endPlayerId), { gridItems: newEndGridItems });
          await batch.commit();
        }
      }
    }
    // --- Scenario 2: Dragging from TRAY ---
    else if (startSource === "tray") {
      // Tray -> Grid
      if (endDestination === "grid") {
        const gridWidth = endInventory.gridWidth;
        const gridHeight = endInventory.gridHeight;
        
        const position = findFirstAvailableSlot(endInventory.gridItems, item, gridWidth, gridHeight);
        if (position === null) {
          toast.error("Destination grid is full!");
          return;
        }
        
        const newItem = { ...item, x: position.x, y: position.y };
        const newStartTrayItems = startInventory.trayItems.filter(i => i.id !== item.id);
        const newEndGridItems = [...endInventory.gridItems, newItem];

        setInventories(prev => ({ ...prev, 
          [startPlayerId]: { ...prev[startPlayerId], trayItems: newStartTrayItems },
          [endPlayerId]: { ...prev[endPlayerId], gridItems: newEndGridItems }
        }));

        const batch = writeBatch(db);
        batch.update(doc(db, "campaigns", campaignId, "inventories", startPlayerId), { trayItems: newStartTrayItems });
        batch.update(doc(db, "campaigns", campaignId, "inventories", endPlayerId), { gridItems: newEndGridItems });
        await batch.commit();
      }
      // Tray -> Tray (Transfer)
      else {
        if (startPlayerId === endPlayerId) return;

        const newStartTrayItems = startInventory.trayItems.filter(i => i.id !== item.id);
        const newEndTrayItems = [...endInventory.trayItems, item];

        setInventories(prev => ({ ...prev, 
          [startPlayerId]: { ...prev[startPlayerId], trayItems: newStartTrayItems },
          [endPlayerId]: { ...prev[endPlayerId], trayItems: newEndTrayItems }
        }));

        const batch = writeBatch(db);
        batch.update(doc(db, 'campaigns', campaignId, 'inventories', startPlayerId), { trayItems: newStartTrayItems });
        batch.update(doc(db, 'campaigns', campaignId, 'inventories', endPlayerId), { trayItems: newEndTrayItems });
        await batch.commit();
      }
    }
  };

  const handleSendItem = async (item, source, sourcePlayerId, targetPlayerId) => {

    if (!item || !source || !sourcePlayerId || !targetPlayerId) {
      return;
    }

    const sourceInventory = inventories[sourcePlayerId];
    const targetInventory = inventories[targetPlayerId];

    if (!sourceInventory || !targetInventory) {
      return;
    }

    let newSourceGridItems = sourceInventory.gridItems || [];
    let newSourceTrayItems = sourceInventory.trayItems || [];

    if (source === 'grid') {
      newSourceGridItems = newSourceGridItems.filter(i => i.id !== item.id);
    } else {
      newSourceTrayItems = newSourceTrayItems.filter(i => i.id !== item.id);
    }

    const { x, y, ...itemForTray } = item;
    const newTargetTrayItems = [...(targetInventory.trayItems || []), itemForTray];
    
    // Update local state
    setInventories(prev => ({ ...prev, 
      [sourcePlayerId]: { ...prev[sourcePlayerId], gridItems: newSourceGridItems, trayItems: newSourceTrayItems },
      [targetPlayerId]: { ...prev[targetPlayerId], trayItems: newTargetTrayItems }
    }));

    // Update Firestore
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'campaigns', campaignId, 'inventories', sourcePlayerId), { gridItems: newSourceGridItems, trayItems: newSourceTrayItems });
      batch.update(doc(db, 'campaigns', campaignId, 'inventories', targetPlayerId), { trayItems: newTargetTrayItems });
      await batch.commit();
      
      toast.success(`Sent ${item.name} to ${playerProfiles[targetPlayerId]?.displayName}.`);
    } catch (error) {
      toast.error("Failed to send item.");
    }
  };

  const handleDuplicateItem = async (item, playerId) => {
    if (!item || !playerId) return;

    // Create a copy of the item with a new unique ID
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    
    const currentInventory = inventories[playerId] || { gridItems: [], trayItems: [] };
    const newTrayItems = [...currentInventory.trayItems, newItem];

    // Update local state for an instant UI change
    setInventories(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        trayItems: newTrayItems,
      }
    }));

    // Save the updated tray to Firestore
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, { trayItems: newTrayItems });
    toast.success(`Duplicated ${item.name}.`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // For mouse
      },
    }),
    useSensor(TouchSensor, {
      // Require a 250ms press delay before a drag starts on touch
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const toggleInventory = (playerId) => {
    setOpenInventories((prev) => ({
      // To only allow one open at a time, you could clear the state: {}
      // To allow multiple open, we use the previous state: ...prev
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!isLoading && Object.keys(inventories).length === 0) {
    return (
      <div className="text-center text-text-muted mt-16 p-4">
        <h2 className="text-2xl font-bold text-text-base">
          This Campaign Is Empty
        </h2>
        <p className="mt-2">
          No player inventories have been created here yet.
        </p>
        <p>
          As the DM, use the "Add Item" button to create an inventory for
          yourself to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center flex-grow">
      {/* --- Modals (Styling has been updated in their own files) --- */}

      {activeTrade && (
        <Trade
          tradeId={activeTrade.id}
          onClose={() => setActiveTrade(null)}
          user={user}
          playerProfiles={playerProfiles}
          campaign={campaign}
        />
      )}

      <TradeNotifications campaignId={campaignId} />

      {isTrading && (
        <StartTrade
          onClose={() => setIsTrading(false)}
          campaign={{id: campaignId, ...campaign}}
          user={user}
          playerProfiles={playerProfiles}
        />
      )}
      
      {showCompendium && (
        <AddFromCompendium
          onClose={() => setShowCompendium(false)}
          onAddItem={handleAddItem}
          players={Object.keys(inventories)}
          dmId={campaign?.dmId}
          playerProfiles={playerProfiles}
        />
      )}

      {editingInventory && (
        <InventorySettings
          onClose={() => setEditingInventory(null)}
          campaignId={campaignId}
          userId={editingInventory}
          currentWidth={inventories[editingInventory]?.gridWidth}
          currentHeight={inventories[editingInventory]?.gridHeight}
        />
      )}

      {splittingItem && (
        <SplitStack
          item={splittingItem.item}
          onClose={() => setSplittingItem(null)}
          onSplit={(splitAmount) => {
            handleSplitStack(splitAmount);
            setSplittingItem(null);
          }}
        />
      )}
      {showAddItem && (
        <AddItem 
          onAddItem={handleAddItem} 
          onClose={() => {
            setShowAddItem(false);
            setItemToEdit(null);
          }}
          isDM={campaign?.dmId === user?.uid}
          itemToEdit={itemToEdit}
        />
      )}
      {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenu.actions}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* --- Main Content --- */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={(() => {
          const isDM = campaign?.dmId === user?.uid;
          return isDM ? [restrictToWindowEdges] : [restrictToParentElement];
        })()}
        collisionDetection={pointerWithin}
      >
        <div className="w-full flex-grow overflow-auto p-4 space-y-8 pb-24 overscroll-contain">
          {Object.entries(inventories)
          .sort(([playerIdA], [playerIdB]) => {
            // If playerIdA is the DM, it should come first (-1).
            if (playerIdA === user.uid) return -1;
            // If playerIdB is the DM, it should come first.
            if (playerIdB === user.uid) return 1;
            // Otherwise, sort alphabetically by display name.
            const nameA = playerProfiles[playerIdA]?.displayName || '';
            const nameB = playerProfiles[playerIdB]?.displayName || '';
            return nameA.localeCompare(nameB);
          })
          .map(([playerId, inventoryData]) => {
            const gridWidth = inventoryData.gridWidth;
            const gridHeight = inventoryData.gridHeight;
            const isPlayerDM = campaign?.dmId === playerId;

            return (
              <div
                key={playerId}
                className="bg-surface rounded-lg shadow-lg shadow-accent/10 border border-accent/20 overflow-hidden"
              >
                <div className="w-full p-2 text-left bg-surface/80 hover:bg-surface/50 focus:outline-none flex justify-between items-center transition-colors duration-200">
                <button onClick={() => toggleInventory(playerId)} className="flex-grow flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-accent font-fantasy tracking-wider">
                    {playerProfiles[playerId]?.displayName || playerId}
                  </h2>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-base transition-transform duration-200 ${ openInventories[playerId] ? "rotate-180" : "" }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {user.uid === playerId && (
                  <button onClick={() => setEditingInventory(playerId)} className="p-2 rounded-full hover:bg-background transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                )}
                </div>

                {openInventories[playerId] && (
                  <div className="p-2 bg-background/50">
                    {isPlayerDM ? (
                      <ItemTray
                        campaignId={campaignId}
                        playerId={playerId}
                        items={inventoryData.trayItems}
                        onContextMenu={handleContextMenu}
                        isDM={isPlayerDM}
                      />
                    ) : (
                      <>
                        <div className="relative">
                        <PlayerInventoryGrid
                          campaignId={campaignId}
                          playerId={playerId}
                          items={inventoryData.gridItems}
                          onContextMenu={handleContextMenu}
                          setGridRef={(node) =>
                            (gridRefs.current[playerId] = node)
                          }
                          isDM={campaign?.dmId === user?.uid}
                          gridWidth={gridWidth}
                          gridHeight={gridHeight}
                          cellSize={cellSizes[playerId]}
                        />
                        <ItemTray
                          campaignId={campaignId}
                          playerId={playerId}
                          items={inventoryData.trayItems}
                          onContextMenu={handleContextMenu}
                          isDM={campaign?.dmId === user?.uid}
                        />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div
              style={{
                width: activeItem.dimensions.width,
                height: activeItem.dimensions.height,
              }}
              className={`${getColorForItemType(activeItem.item.type)} rounded-lg text-text-base font-bold p-1 text-center text-xs sm:text-sm flex items-center justify-center shadow-lg`}
            >
              {activeItem.item.name}
              {activeItem.item.stackable && activeItem.item.quantity > 1 && (
                <span className="absolute bottom-0 right-1 text-lg font-black" style={{ WebkitTextStroke: "1px black" }}>
                  {activeItem.item.quantity}
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* --- Floating Action Button --- */}
      <div className="fixed z-30 bottom-8 right-8 flex flex-col space-y-2">
        <button
          onClick={() => setShowCompendium(true)}
          className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-background rounded-full p-4 shadow-lg"
          aria-label="Add Item from Compendium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-5.747-5.747H17.747" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <button
          onClick={() => setShowAddItem(true)}
          className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-background rounded-full p-4 shadow-lg"
          aria-label="Create New Item"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}