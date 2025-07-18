import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { doc, updateDoc, arrayRemove, writeBatch } from "firebase/firestore";
import { db } from '../firebase';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { restrictToParentElement, restrictToWindowEdges } from '@dnd-kit/modifiers';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import { findFirstAvailableSlot, onOtherItem, outOfBounds } from '../utils/gridUtils'; // Import from utils
import { useCampaignData } from '../hooks/useCampaignData'; // Import the custom hook
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import SplitStack from './SplitStack';
import Spinner from './Spinner';
import ItemTray from './ItemTray';

export default function InventoryGrid({ campaignId, user, userProfile }) {
  
  const { inventories, setInventories, campaign, playerProfiles, isLoading } = useCampaignData(campaignId, user, userProfile);

  // State for UI interactions remains here
  const [showAddItem, setShowAddItem] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, item: null, playerId: null, actions: [] });
  const [itemToEdit, setItemToEdit] = useState(null);
  const [splittingItem, setSplittingItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [openInventories, setOpenInventories] = useState({});
  
  const gridRefs = useRef({});

  const handleContextMenu = (event, item, playerId) => {
    // We can now safely assume 'event' exists, so we remove the '?'
    event.preventDefault();

    // Dynamically build the actions array
    const availableActions = [
      { label: "Edit Item", onClick: () => handleStartEdit(item, playerId) },
    ];
    if (item.stackable && item.quantity > 1) {
      availableActions.push({
        label: "Split Stack",
        onClick: () => handleStartSplit(item, playerId),
      });
    }
    availableActions.push({
      label: "Delete Item",
      onClick: () => handleDeleteItem(item, playerId),
    });

    // The rest of the function works as intended
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

    const inventoryDocRef = doc(
      db,
      "campaigns",
      campaignId,
      "inventories",
      playerId
    );
    await updateDoc(inventoryDocRef, {
      items: arrayRemove(item), // Use the item passed directly to the function
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
      // We no longer need x and y for new items
      const { x, y, ...newItemData } = itemData;
      const newTrayItems = [...currentInventory.trayItems, newItemData];

      setInventories((prev) => ({
        ...prev,
        [finalPlayerId]: { ...prev[finalPlayerId], trayItems: newTrayItems },
      }));
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
    const source = active.data.current?.source; // Check if it's from the 'grid' or 'tray'

    if (!item) return;

    // If the item comes from the grid, calculate its size dynamically
    if (source === 'grid') {
      const gridElement = gridRefs.current[ownerId];
      if (!gridElement) return;

      const playerProfile = playerProfiles[ownerId];
      const gridWidth = playerProfile?.gridWidth || 30;
      const gridHeight = playerProfile?.gridHeight || 10;
      
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

    if (!over) return; // Dropped outside any droppable zone

    const startSource = active.data.current?.source; // 'grid' or 'tray'
    const startPlayerId = active.data.current?.ownerId;
    const item = active.data.current?.item;

    // The end ID could be a playerId (for a grid) or "playerId-tray"
    const endDroppableId = over.id;
    const endPlayerId = endDroppableId.toString().replace("-tray", "");
    const endDestination = endDroppableId.toString().includes("-tray")
      ? "tray"
      : "grid";

    if (!startPlayerId || !endPlayerId || !item) return;

    const startInventory = inventories[startPlayerId];
    const endInventory = inventories[endPlayerId];

    // --- Scenario 1: Dragging from GRID ---
    if (startSource === "grid") {
      // Grid -> Tray
      if (endDestination === "tray") {
        const newStartGridItems = startInventory.gridItems.filter(
          (i) => i.id !== item.id
        );
        const {x, y, ...trayItem} = item;
        const newEndTrayItems = [...endInventory.trayItems, trayItem];

        setInventories((prev) => ({
          ...prev,
          [startPlayerId]: {
            ...prev[startPlayerId],
            gridItems: newStartGridItems,
          },
          [endPlayerId]: { ...prev[endPlayerId], trayItems: newEndTrayItems },
        }));

        const batch = writeBatch(db);
        batch.update(
          doc(db, "campaigns", campaignId, "inventories", startPlayerId),
          { gridItems: newStartGridItems }
        );
        batch.update(
          doc(db, "campaigns", campaignId, "inventories", endPlayerId),
          { trayItems: newEndTrayItems }
        );
        await batch.commit();
      }
      // Grid -> Grid (Reposition or Transfer)
      else {
        // --- Scenario 1A: Repositioning item within the SAME grid ---
        if (startPlayerId === endPlayerId) {
          const gridElement = gridRefs.current[startPlayerId];
          if (!gridElement) return;

          const profile = playerProfiles[startPlayerId];
          const gridWidth = profile?.gridWidth || 30;
          const gridHeight = profile?.gridHeight || 10;
          const currentGridItems = startInventory.gridItems || [];

          const cellSize = {
            width: gridElement.offsetWidth / gridWidth,
            height: gridElement.offsetHeight / gridHeight,
          };

          const newX = Math.round(
            (item.x * cellSize.width + delta.x) / cellSize.width
          );
          const newY = Math.round(
            (item.y * cellSize.height + delta.y) / cellSize.height
          );

          if (outOfBounds(newX, newY, item, gridWidth, gridHeight)) return;
          const isColliding = currentGridItems.some(
            (other) =>
              other.id !== item.id && onOtherItem(newX, newY, item, other)
          );
          if (isColliding) return;

          const newGridItems = currentGridItems.map((i) =>
            i.id === item.id ? { ...i, x: newX, y: newY } : i
          );

          setInventories((prev) => ({
            ...prev,
            [startPlayerId]: {
              ...prev[startPlayerId],
              gridItems: newGridItems,
            },
          }));
          const inventoryDocRef = doc(
            db,
            "campaigns",
            campaignId,
            "inventories",
            startPlayerId
          );
          await updateDoc(inventoryDocRef, { gridItems: newGridItems });
        }
        // --- Scenario 1B: Transferring item to a DIFFERENT grid ---
        else {
          const endPlayerProfile = playerProfiles[endPlayerId];
          const endGridWidth = endPlayerProfile?.gridWidth || 30;
          const endGridHeight = endPlayerProfile?.gridHeight || 10;
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

          if (
            outOfBounds(newX, newY, item, endGridWidth, endGridHeight) ||
            endGridItems.some((other) => onOtherItem(newX, newY, item, other))
          ) {
            finalPosition = findFirstAvailableSlot(
              endGridItems,
              item,
              endGridWidth,
              endGridHeight
            );
          }

          if (finalPosition === null) {
            toast.error("Destination inventory is full!");
            return;
          }

          const newItem = { ...item, x: finalPosition.x, y: finalPosition.y };
          const newStartGridItems = startGridItems.filter(
            (i) => i.id !== item.id
          );
          const newEndGridItems = [...endGridItems, newItem];

          setInventories((prev) => ({
            ...prev,
            [startPlayerId]: {
              ...prev[startPlayerId],
              gridItems: newStartGridItems,
            },
            [endPlayerId]: { ...prev[endPlayerId], gridItems: newEndGridItems },
          }));

          const batch = writeBatch(db);
          const startInventoryRef = doc(
            db,
            "campaigns",
            campaignId,
            "inventories",
            startPlayerId
          );
          const endInventoryRef = doc(
            db,
            "campaigns",
            campaignId,
            "inventories",
            endPlayerId
          );
          batch.update(startInventoryRef, { gridItems: newStartGridItems });
          batch.update(endInventoryRef, { gridItems: newEndGridItems });
          await batch.commit();
        }
      }
    }
    // --- Scenario 2: Dragging from TRAY ---
    else if (startSource === "tray") {
      // Tray -> Grid
      if (endDestination === "grid") {
        const profile = playerProfiles[endPlayerId];
        const gridWidth = profile?.gridWidth || 30;
        const gridHeight = profile?.gridHeight || 10;

        const position = findFirstAvailableSlot(
          endInventory.gridItems,
          item,
          gridWidth,
          gridHeight
        );
        if (position === null) {
          toast.error("Destination grid is full!");
          return;
        }

        const newItem = { ...item, x: position.x, y: position.y };
        const newStartTrayItems = startInventory.trayItems.filter(
          (i) => i.id !== item.id
        );
        const newEndGridItems = [...endInventory.gridItems, newItem];

        setInventories((prev) => ({
          ...prev,
          [startPlayerId]: {
            ...prev[startPlayerId],
            trayItems: newStartTrayItems,
          },
          [endPlayerId]: { ...prev[endPlayerId], gridItems: newEndGridItems },
        }));

        const batch = writeBatch(db);
        batch.update(
          doc(db, "campaigns", campaignId, "inventories", startPlayerId),
          { trayItems: newStartTrayItems }
        );
        batch.update(
          doc(db, "campaigns", campaignId, "inventories", endPlayerId),
          { gridItems: newEndGridItems }
        );
        await batch.commit();
      }
      else { // Tray -> Tray (Transfer)
        if (startPlayerId === endPlayerId) return; // Do nothing if it's the same tray

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require mouse to move 8px before a drag starts
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
      <div className="text-center text-gray-400 mt-16 p-4">
        <h2 className="text-2xl font-bold text-white">
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
        {/* Main content area */}
        <div className={`w-full flex-grow p-4 space-y-8 pb-24 ${!activeItem ? "overflow-y-hidden" : "overflow-y-auto"}`}>
          {Object.entries(inventories).map(([playerId, inventoryData]) => {
            const profile = playerProfiles[playerId];
            const gridWidth = profile?.gridWidth || 30;
            const gridHeight = profile?.gridHeight || 10;
            const isDM = campaign?.dmId === playerId;

            return (
              <div
                key={playerId}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleInventory(playerId)}
                  // Padding reduced from p-3 to p-2
                  className="w-full p-2 text-left bg-gray-700 hover:bg-gray-600 focus:outline-none flex justify-between items-center"
                >
                  {/* Font size reduced from text-xl to text-lg */}
                  <h2 className="text-lg font-bold text-white">
                    {playerProfiles[playerId]?.displayName || playerId}
                  </h2>
                  {/* Icon size reduced from h-6 w-6 to h-5 w-5 */}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-white transition-transform duration-200 ${ openInventories[playerId] ? "rotate-180" : "" }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {openInventories[playerId] && (
                  <div className="p-2">
                    {/* If the user is a DM, ONLY show their tray */}
                    {isDM ? (
                      <ItemTray
                        campaignId={campaignId}
                        playerId={playerId}
                        items={inventoryData.trayItems}
                        onContextMenu={handleContextMenu}
                        isDM={isDM}
                      />
                    ) : (
                      <>
                        {/* Players see both their grid and their tray */}
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
                        />
                        <ItemTray
                          campaignId={campaignId}
                          playerId={playerId}
                          items={inventoryData.trayItems}
                          onContextMenu={handleContextMenu}
                          isDM={campaign?.dmId === user?.uid}
                        />
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
              className={`${activeItem.item.color} rounded-lg text-white font-bold p-1 text-center text-xs sm:text-sm flex items-center justify-center shadow-lg`}
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
      <button
        onClick={() => setShowAddItem(true)}
        className="fixed z-30 bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400" aria-label="Add Item"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    </div>
  );
}