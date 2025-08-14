import React, { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { doc, updateDoc, writeBatch, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import { findFirstAvailableSlot, onOtherItem, outOfBounds } from '../utils/gridUtils';
import { useCampaignData } from '../hooks/useCampaignData';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import SplitStack from './SplitStack';
import Spinner from './Spinner';
import ItemTray from './ItemTray';
import InventorySettings from './InventorySettings';
import { getColorForItemType } from '../utils/itemUtils';
import AddFromCompendium from './AddFromCompendium';
import StartTrade from './StartTrade';
import TradeNotifications from './TradeNotifications';
import Trade from './Trade';
import { usePlayerProfiles } from '../hooks/usePlayerProfiles';
import CampaignLayout from './CampaignLayout';
import WeightCounter from './WeightCounter';

const PlayerInventory = ({
  playerId, inventoryData, campaign, playerProfiles, user,
  setEditingSettings, cellSizes, gridRefs, onContextMenu
}) => {
  // THIS IS THE FIX: All hooks are now at the top of the component, before any returns.
  // We use optional chaining (?.) to prevent errors if inventoryData is not ready.
  const containers = useMemo(() => Object.values(inventoryData?.containers || {}), [inventoryData]);

  const totalWeightLbs = useMemo(() => {
    if (!inventoryData) return 0;
    
    const containerGridItems = containers
      .filter(c => c.trackWeight ?? true)
      .flatMap(c => c.gridItems || []);
    const playerTrayItems = inventoryData.trayItems || [];
    const allItems = [...containerGridItems, ...playerTrayItems];

    return allItems.reduce((total, item) => {
        const weightValue = parseFloat(item.weight);
        if (!isNaN(weightValue)) {
          return total + (weightValue * (item.quantity || 1));
        }
        return total;
      }, 0);
  }, [inventoryData, containers]);
  
  // The conditional return now correctly happens AFTER all hooks are called.
  if (!inventoryData) return null;

  const isPlayerDM = campaign?.dmId === playerId;
  const isMyInventory = user.uid === playerId;

  return (
    <div className="bg-surface rounded-lg shadow-lg shadow-accent/10 border border-accent/20 overflow-hidden">
      <div className="w-full p-2 text-left bg-surface/80 flex justify-between items-center">
        <h2 className="text-xl font-bold text-accent font-fantasy tracking-wider">
          {inventoryData.characterName || playerProfiles[playerId]?.displayName}
        </h2>
        <div className="flex items-center space-x-4">
          {!isPlayerDM && (
            <WeightCounter
              currentWeight={totalWeightLbs}
              maxWeight={inventoryData.totalMaxWeight || 0}
              unit={inventoryData.weightUnit || 'lbs'}
            />
          )}
          {isMyInventory && (
            <button
              onClick={() => setEditingSettings({
                playerId: playerId,
                currentSettings: inventoryData,
                isDMInventory: isPlayerDM
              })}
              className="p-2 rounded-full hover:bg-background transition-colors"
              aria-label="Edit character and inventory settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="p-2 bg-background/50 space-y-4">
        {isPlayerDM ? (
            containers.map(container => (
                <ItemTray
                    key={container.id}
                    items={container.trayItems || []}
                    containerId={container.id}
                    onContextMenu={onContextMenu}
                    playerId={playerId}
                />
            ))
        ) : (
            <>
                <div className="flex flex-row flex-wrap gap-4">
                  {containers.map((container) => (
                    // THIS IS THE FIX (Part 2): Set a dynamic width for each container
                    // The width is based on the container's gridWidth, with min/max values.
                    <div 
                      key={container.id} 
                      className="bg-surface/50 rounded-lg p-2 flex-grow"
                      style={{ flexBasis: `${container.gridWidth * 3.5}rem`, minWidth: '12rem' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-text-muted">{container.name}</h3>
                      </div>
                      <PlayerInventoryGrid
                        items={container.gridItems || []}
                        gridWidth={container.gridWidth}
                        gridHeight={container.gridHeight}
                        containerId={container.id}
                        onContextMenu={onContextMenu}
                        playerId={playerId}
                        setGridRef={(node) => (gridRefs.current[container.id] = node)}
                        cellSize={cellSizes[container.id]}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                    <h3 className="font-bold font-fantasy text-text-muted p-2">Floor / Ground</h3>
                    <ItemTray
                        items={inventoryData.trayItems || []}
                        containerId="tray" 
                        onContextMenu={onContextMenu}
                        playerId={playerId}
                    />
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default function InventoryGrid({ campaignId, user, userProfile, isTrading, setIsTrading }) {

  const { inventories, setInventories, campaign, isLoading: inventoriesLoading } = useCampaignData(campaignId, user);
  const { playerProfiles, isLoading: profilesLoading } = usePlayerProfiles(campaignId);
  const isLoading = inventoriesLoading || profilesLoading;

  const isDM = campaign?.dmId === user?.uid;

  const [showAddItem, setShowAddItem] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, item: null, playerId: null, actions: [] });
  const [itemToEdit, setItemToEdit] = useState(null);
  const [splittingItem, setSplittingItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [openTrays, setOpenTrays] = useState({});
  const [editingSettings, setEditingSettings] = useState(null);
  const [cellSizes, setCellSizes] = useState({});
  const [showCompendium, setShowCompendium] = useState(false);
  const [activeTrade, setActiveTrade] = useState(null);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);

  const gridRefs = useRef({});

  const containerStructureSignature = useMemo(() => {
    return Object.values(inventories)
        .flatMap(inv => Object.values(inv.containers || {}))
        .map(c => `${c.id}-${c.gridWidth}-${c.gridHeight}`)
        .join(',');
  }, [inventories]);

  const orderedAndVisibleInventories = useMemo(() => {
    if (!user || !inventories || Object.keys(inventories).length === 0) return [];

    if (!isDM) {
        // If the user is a player, only return their own inventory data.
        const myInventory = inventories[user.uid];
        return myInventory ? [[user.uid, myInventory]] : [];
    }
    
    // If the user is the DM, use the existing layout and visibility logic.
    if (!campaign?.layout) {
      return Object.entries(inventories);
    }
    const { order = [], visible = {} } = campaign.layout;
    const ordered = order
        .map(playerId => ([playerId, inventories[playerId]]))
        .filter(entry => entry[1]); // Ensure player data exists
    
    return ordered.filter(([playerId]) => visible[playerId] ?? true);

  }, [campaign, inventories, user, isDM]);

  const handleTradeStarted = (trade) => {
    setActiveTrade(trade);
  };

  useEffect(() => {
    if (!user || !campaignId) return;

    const tradesRef = collection(db, 'trades');
    
    // Create a query that looks for trades in this campaign where:
    // 1. The current user is the one being invited (playerB).
    // 2. The trade has just become 'active'.
    const q = query(
      tradesRef,
      where('campaignId', '==', campaignId),
      where('playerB', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If a trade matching this query appears, it means we just accepted an invitation.
      if (!snapshot.empty) {
        const tradeDoc = snapshot.docs[0];
        // Set this as the active trade, which will open the trade window UI.
        setActiveTrade({ id: tradeDoc.id, ...tradeDoc.data() });
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [campaignId, user]);

  useEffect(() => {
    const observers = [];
    
    Object.entries(gridRefs.current).forEach(([containerId, gridElement]) => {
      if (gridElement) {
        const measure = () => {
          let containerData;
          for (const inv of Object.values(inventories)) {
            if (inv.containers && inv.containers[containerId]) {
              containerData = inv.containers[containerId];
              break;
            }
          }

          if (containerData) {
            setCellSizes(prev => ({
              ...prev,
              [containerId]: {
                width: gridElement.offsetWidth / containerData.gridWidth,
                height: gridElement.offsetHeight / containerData.gridHeight,
              }
            }));
          }
        };

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(gridElement);
        measure();
        
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
  }, [containerStructureSignature, inventories]);

  const handleContextMenu = (event, item, playerId, source, containerId) => {
    event.preventDefault();
    
    const isDM = campaign?.dmId === user?.uid;
    const isMyInventory = user.uid === playerId;
    const availableActions = [];

    if (source === 'grid' && !item.stackable) {
        availableActions.push({ 
            label: 'Rotate', 
            onClick: () => handleRotateItem(item, playerId, containerId) 
        });
    }

    if (isDM) {
      const otherPlayers = Object.keys(playerProfiles).filter(id => id !== playerId);
      if (otherPlayers.length > 0) {
        availableActions.push({
          label: 'Send to...',
          submenu: otherPlayers.map(targetId => ({
            label: playerProfiles[targetId]?.characterName || playerProfiles[targetId]?.displayName || targetId,
            onClick: () => handleSendItem(item, source, playerId, targetId, containerId),
          })),
        });
      }
    }

    if (item.stackable && item.quantity > 1) {
      availableActions.push({ label: 'Split Stack', onClick: () => handleStartSplit(item, playerId, containerId) });
    }
    if (isDM || isMyInventory) {
      availableActions.push({ 
        label: 'Edit Item', 
        onClick: () => handleStartEdit(item, playerId, containerId),
      });
      availableActions.push({ label: 'Duplicate Item', onClick: () => handleDuplicateItem(item, playerId, containerId) });
      availableActions.push({
        label: 'Delete Item',
        onClick: () => handleDeleteItem(item, playerId, source, containerId),
      });
    }

    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      actions: availableActions,
    });
  };

  const handleStartSplit = (item, playerId, containerId) => {
    setSplittingItem({ item, playerId, containerId });
  };

  const handleDeleteItem = async (item, playerId, source, containerId) => {
    if (!item || !playerId || !source || !containerId) return;

    const containerDocRef = doc(db, "campaigns", campaignId, "inventories", playerId, "containers", containerId);
    const currentContainer = inventories[playerId].containers[containerId];
    
    let updatePayload = {};
    if (source === 'grid') {
      updatePayload.gridItems = currentContainer.gridItems.filter(i => i.id !== item.id);
    } else {
      updatePayload.trayItems = currentContainer.trayItems.filter(i => i.id !== item.id);
    }

    await updateDoc(containerDocRef, updatePayload);
  };

  const handleStartEdit = (item, playerId, containerId) => {
    if (!item) return;
    setItemToEdit({ item, playerId, containerId });
    setShowAddItem(true);
  };

  const handleAddItem = async (itemData, targetPlayerId) => {
    let finalPlayerId;

    if (itemToEdit) {
      // Case 1: We are editing an existing item. The owner is fixed.
      finalPlayerId = itemToEdit.playerId;
    } else if (targetPlayerId && isDM) {
      // Case 2: The DM is adding an item from the compendium to a specific player.
      finalPlayerId = targetPlayerId;
    } else {
      // Case 3: A player is creating a new item for themselves, OR the DM is creating one for themself.
      finalPlayerId = user.uid;
    }

    if (!campaignId || !finalPlayerId) {
      toast.error("Could not determine the target player.");
      return;
    }

    const playerInventory = inventories[finalPlayerId];
    const isTargetDM = campaign?.dmId === finalPlayerId;

    // --- Item Editing Logic ---
    if (itemToEdit) {
      const { item: originalItem, containerId } = itemToEdit;
      
      // Check if the item is in a grid (and not the DM's special tray)
      if (containerId && containerId !== 'tray' && !isTargetDM) {
        
        // --- Logic for items in a container's grid (with size checks) ---
        const container = playerInventory.containers[containerId];
        const otherItems = container.gridItems.filter(i => i.id !== originalItem.id);
        const updatedItem = { ...originalItem, ...itemData };

        const canStayInPlace = !outOfBounds(updatedItem.x, updatedItem.y, updatedItem, container.gridWidth, container.gridHeight) &&
                               !otherItems.some(other => onOtherItem(updatedItem.x, updatedItem.y, updatedItem, other));

        let finalGridItems;
        let finalTrayItems = [...(playerInventory.trayItems || [])];

        if (canStayInPlace) {
            finalGridItems = container.gridItems.map(i => i.id === originalItem.id ? updatedItem : i);
            toast.success(`Updated ${itemData.name}.`);
        } else {
            const newSlot = findFirstAvailableSlot(otherItems, updatedItem, container.gridWidth, container.gridHeight);
            if (newSlot) {
                finalGridItems = [...otherItems, { ...updatedItem, ...newSlot }];
                toast.success(`${itemData.name} was updated and moved to a new slot.`);
            } else {
                const { x, y, ...trayItem } = updatedItem;
                finalGridItems = otherItems; // Remove from grid
                finalTrayItems.push(trayItem);
                toast.error(`No space for the new size. Moved ${itemData.name} to the tray.`);
            }
        }

        const batch = writeBatch(db);
        const playerInvRef = doc(db, 'campaigns', campaignId, 'inventories', finalPlayerId);
        const containerRef = doc(playerInvRef, 'containers', containerId);
        batch.update(containerRef, { gridItems: finalGridItems });
        batch.update(playerInvRef, { trayItems: finalTrayItems });
        await batch.commit();

      } else {
        // --- Logic for items in a tray (no size checks needed) ---
        const isDMItem = isTargetDM && containerId;
        if (isDMItem) {
            // DM's items are in a container's tray
            const container = playerInventory.containers[containerId];
            const updatedTrayItems = (container.trayItems || []).map(i => i.id === originalItem.id ? { ...i, ...itemData } : i);
            const containerDocRef = doc(db, "campaigns", campaignId, "inventories", finalPlayerId, "containers", containerId);
            await updateDoc(containerDocRef, { trayItems: updatedTrayItems });
        } else {
            // Player's items are in the main tray
            const updatedTrayItems = (playerInventory.trayItems || []).map(i => i.id === originalItem.id ? { ...i, ...itemData } : i);
            const playerInvRef = doc(db, "campaigns", campaignId, "inventories", finalPlayerId);
            await updateDoc(playerInvRef, { trayItems: updatedTrayItems });
        }
        toast.success(`Updated ${itemData.name}.`);
      }
    }  
    // --- Item Creation Logic ---
    else {
      if (isTargetDM) {
        // If the target is the DM, add to their first container's tray.
        const defaultContainer = Object.values(playerInventory.containers || {})[0];
        if (!defaultContainer) {
          toast.error("DM has no containers to add items to!");
          return;
        }
        const containerDocRef = doc(db, "campaigns", campaignId, "inventories", finalPlayerId, "containers", defaultContainer.id);
        const currentTray = defaultContainer.trayItems || [];
        await updateDoc(containerDocRef, { trayItems: [...currentTray, itemData] });
      } else {
        // If the target is a player, add to their main shared tray.
        const inventoryDocRef = doc(db, "campaigns", campaignId, "inventories", finalPlayerId);
        const currentTray = playerInventory?.trayItems || [];
        await setDoc(inventoryDocRef, { trayItems: [...currentTray, itemData] }, { merge: true });
      }
      
      const targetName = playerInventory?.characterName || playerProfiles[finalPlayerId]?.displayName;
      toast.success(`Added ${itemData.name} to ${targetName}'s inventory.`);
    }

    setItemToEdit(null);
  };

  const handleSplitStack = async (splitAmount) => {
    if (!splittingItem) return;

    const { item: originalItem, playerId, containerId } = splittingItem;
    const amount = parseInt(splitAmount, 10);

    if (isNaN(amount) || amount <= 0 || amount >= originalItem.quantity) return;

    const container = inventories[playerId].containers[containerId];
    const containerDocRef = doc(db, "campaigns", campaignId, "inventories", playerId, "containers", containerId);

    const updatedOriginalItem = { ...originalItem, quantity: originalItem.quantity - amount };
    const newItem = { ...originalItem, id: crypto.randomUUID(), quantity: amount };

    const itemsForCollisionCheck = container.gridItems.map(i => i.id === originalItem.id ? updatedOriginalItem : i);
    const availableSlot = findFirstAvailableSlot(itemsForCollisionCheck, newItem, container.gridWidth, container.gridHeight);

    let finalGridItems = itemsForCollisionCheck;
    let finalTrayItems = [...(container.trayItems || [])];

    if (availableSlot) {
      finalGridItems.push({ ...newItem, ...availableSlot });
    } else {
      const { x, y, ...trayItem } = newItem;
      finalTrayItems.push(trayItem);
    }
    
    const originalItemInGrid = container.gridItems.some(i => i.id === originalItem.id);
    if(originalItemInGrid) {
        finalGridItems = finalGridItems.map(i => i.id === originalItem.id ? updatedOriginalItem : i)
    } else {
        finalTrayItems = finalTrayItems.map(i => i.id === originalItem.id ? updatedOriginalItem : i)
    }

    await updateDoc(containerDocRef, {
      gridItems: finalGridItems,
      trayItems: finalTrayItems,
    });
    setSplittingItem(null);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const item = active.data.current?.item;
    const source = active.data.current?.source;
    const containerId = active.data.current?.containerId;

    if (!item) return;

    let dimensions = { width: 80, height: 80 }; // Default size for tray items

    if (source === 'grid' && containerId && gridRefs.current[containerId]) {
      const gridElement = gridRefs.current[containerId];
      const ownerId = active.data.current?.ownerId;
      const container = inventories[ownerId]?.containers[containerId];
      
      if (container) {
        const cellSize = {
          width: gridElement.offsetWidth / container.gridWidth,
          height: gridElement.offsetHeight / container.gridHeight,
        };
        dimensions = {
          width: item.w * cellSize.width,
          height: item.h * cellSize.height,
        };
      }
    }

    setActiveItem({ item, dimensions });
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  const handleDragEnd = async (event) => {
    setActiveItem(null);
    const { active, over } = event;

    if (!over) {
      return;
    }

    // --- 1. Get Data ---
    const item = active.data.current?.item;
    const startPlayerId = active.data.current?.ownerId;
    const startContainerId = active.data.current?.containerId;
    const startSource = active.data.current?.source;

    let endPlayerId, endContainerId, endDestination;
    if (over.data.current?.item) {
        endPlayerId = over.data.current.ownerId;
        endContainerId = over.data.current.containerId;
        endDestination = over.data.current.source;
    } else {
        const endIdParts = over.id.toString().split('|');
        endPlayerId = endIdParts[0];
        endContainerId = endIdParts[1];
        endDestination = endIdParts[2];
    }

    if (!item || !startPlayerId || !endPlayerId) {
        return;
    }

    // --- 2. Optimistic Update ---
    const newInventories = JSON.parse(JSON.stringify(inventories));
    let movedItem = null;

    const startPlayerInv = newInventories[startPlayerId];
    const endPlayerInv = newInventories[endPlayerId];

    if (!startPlayerInv || !endPlayerInv) {
        return;
    }

    const isStartDM = startPlayerInv.characterName === 'DM';
    const isEndDM = endPlayerInv.characterName === 'DM';

    // --- Remove from source ---
    if (startSource === 'grid') {
        const sourceContainer = startPlayerInv.containers?.[startContainerId];
        if (!sourceContainer?.gridItems) return;
        const itemIndex = sourceContainer.gridItems.findIndex(i => i.id === item.id);
        if (itemIndex > -1) [movedItem] = sourceContainer.gridItems.splice(itemIndex, 1);
    } else { // 'tray'
        const sourceTray = isStartDM
            ? startPlayerInv.containers?.[startContainerId]?.trayItems
            : startPlayerInv.trayItems;
        if (!sourceTray) return;
        const itemIndex = sourceTray.findIndex(i => i.id === item.id);
        if (itemIndex > -1) [movedItem] = sourceTray.splice(itemIndex, 1);
    }

    if (!movedItem) {
        return;
    }

    // --- Add to destination ---
    if (endDestination === 'grid') {
        const endContainer = endPlayerInv.containers?.[endContainerId];
        if (!endContainer) return;
        const gridElement = gridRefs.current[endContainerId];
        if (!gridElement) return;

        const { gridWidth, gridHeight } = endContainer;
        const cellSize = { width: gridElement.offsetWidth / gridWidth, height: gridElement.offsetHeight / gridHeight };
        const rect = gridElement.getBoundingClientRect();
        const dropX = active.rect.current.translated.left - rect.left;
        const dropY = active.rect.current.translated.top - rect.top;
        
        let finalPos = { x: Math.round(dropX / cellSize.width), y: Math.round(dropY / cellSize.height) };
        if (outOfBounds(finalPos.x, finalPos.y, movedItem, gridWidth, gridHeight) || endContainer.gridItems.some(other => onOtherItem(finalPos.x, finalPos.y, movedItem, other))) {
            finalPos = findFirstAvailableSlot(endContainer.gridItems, movedItem, gridWidth, gridHeight);
        }
        if (finalPos) {
            endContainer.gridItems.push({ ...movedItem, ...finalPos });
        } else {
            toast.error("No space in destination!");
            const sourceTray = isStartDM ? startPlayerInv.containers[startContainerId].trayItems : startPlayerInv.trayItems;
            sourceTray.push(movedItem);
        }
    } else { // 'tray'
        const { x, y, ...trayItem } = movedItem;
        if (isEndDM) {
            const destContainer = endPlayerInv.containers?.[endContainerId];
            if (!destContainer) {
                return;
            }
            if (!destContainer.trayItems) destContainer.trayItems = [];
            destContainer.trayItems.push(trayItem);
        } else {
            if (!endPlayerInv.trayItems) endPlayerInv.trayItems = [];
            endPlayerInv.trayItems.push(trayItem);
        }
    }
    setInventories(newInventories);

    // --- 3. Firestore Update ---
    const batch = writeBatch(db);
    let sourceRef, destRef, sourcePayload, destPayload;

    if (startSource === 'grid') {
        sourceRef = doc(db, "campaigns", campaignId, "inventories", startPlayerId, "containers", startContainerId);
        sourcePayload = { gridItems: newInventories[startPlayerId].containers[startContainerId].gridItems };
    } else {
        sourceRef = isStartDM
            ? doc(db, "campaigns", campaignId, "inventories", startPlayerId, "containers", startContainerId)
            : doc(db, "campaigns", campaignId, "inventories", startPlayerId);
        sourcePayload = { trayItems: isStartDM ? newInventories[startPlayerId].containers[startContainerId].trayItems : newInventories[startPlayerId].trayItems };
    }

    if (endDestination === 'grid') {
        destRef = doc(db, "campaigns", campaignId, "inventories", endPlayerId, "containers", endContainerId);
        destPayload = { gridItems: newInventories[endPlayerId].containers[endContainerId].gridItems };
    } else {
        destRef = isEndDM
            ? doc(db, "campaigns", campaignId, "inventories", endPlayerId, "containers", endContainerId)
            : doc(db, "campaigns", campaignId, "inventories", endPlayerId);
        destPayload = { trayItems: isEndDM ? newInventories[endPlayerId].containers[endContainerId].trayItems : newInventories[endPlayerId].trayItems };
    }

    if (sourceRef.path === destRef.path) {
        batch.update(sourceRef, { ...sourcePayload, ...destPayload });
    } else {
        batch.update(sourceRef, sourcePayload);
        batch.update(destRef, destPayload);
    }
    
    try {
        await batch.commit();
    } catch (error) {
        toast.error("Failed to move item. Reverting changes.");
        setInventories(inventories);
    }
  };

  const handleSendItem = async (item, source, sourcePlayerId, targetPlayerId, sourceContainerId) => {
    if (!item || !source || !sourcePlayerId || !targetPlayerId || !sourceContainerId) return;

    const sourceInventory = inventories[sourcePlayerId];
    const targetInventory = inventories[targetPlayerId];
    if (!sourceInventory || !targetInventory) return;

    const sourceContainer = sourceInventory.containers[sourceContainerId];
    const targetContainer = Object.values(targetInventory.containers || {})[0];
    if (!sourceContainer || !targetContainer) return;

    const batch = writeBatch(db);
    const sourceContainerRef = doc(db, 'campaigns', campaignId, 'inventories', sourcePlayerId, 'containers', sourceContainer.id);
    const targetContainerRef = doc(db, 'campaigns', campaignId, 'inventories', targetPlayerId, 'containers', targetContainer.id);
    
    if (source === 'grid') {
      batch.update(sourceContainerRef, { gridItems: sourceContainer.gridItems.filter(i => i.id !== item.id) });
    } else {
      batch.update(sourceContainerRef, { trayItems: sourceContainer.trayItems.filter(i => i.id !== item.id) });
    }
    
    const { x, y, ...itemForTray } = item;
    batch.update(targetContainerRef, { trayItems: [...(targetContainer.trayItems || []), itemForTray] });

    await batch.commit();
    const targetName = targetInventory.characterName || playerProfiles[targetPlayerId]?.displayName;
    toast.success(`Sent ${item.name} to ${targetName}.`);
  };

  const handleDuplicateItem = async (item, playerId, containerId) => {
    if (!item || !playerId || !containerId) return;

    const newItem = {
      ...item,
      id: crypto.randomUUID(),
    };

    const container = inventories[playerId]?.containers[containerId];
    if (!container) {
        toast.error("Could not find the container to add the item to.");
        return;
    }

    const newTrayItems = [...(container.trayItems || []), newItem];

    const containerDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId, 'containers', containerId);
    await updateDoc(containerDocRef, { trayItems: newTrayItems });
    toast.success(`Duplicated ${item.name}.`);
  };

  const handleRotateItem = async (item, playerId, containerId) => {
    if (!item || !playerId || !containerId) return;

    const inventory = inventories[playerId];
    const container = inventory?.containers?.[containerId];
    if (!container) return;

    // 1. Swap the item's width and height
    const rotatedItem = { ...item, w: item.h, h: item.w };

    // 2. Create a list of all *other* items in the grid for collision checking
    const otherItems = container.gridItems.filter(i => i.id !== item.id);

    // 3. Check if the rotated item can stay in its current top-left corner
    const canStayInPlace = !outOfBounds(rotatedItem.x, rotatedItem.y, rotatedItem, container.gridWidth, container.gridHeight) &&
                           !otherItems.some(other => onOtherItem(rotatedItem.x, rotatedItem.y, rotatedItem, other));

    let finalGridItems;
    let finalTrayItems = [...(inventory.trayItems || [])];

    if (canStayInPlace) {
      // If it fits, simply update the item in the grid
      finalGridItems = container.gridItems.map(i => i.id === item.id ? rotatedItem : i);
      toast.success(`Rotated ${item.name}.`);
    } else {
      // 4. If it can't stay, find the next available slot for the new dimensions
      const availableSlot = findFirstAvailableSlot(otherItems, rotatedItem, container.gridWidth, container.gridHeight);

      if (availableSlot) {
        // If a new slot is found, move the rotated item there
        const movedAndRotatedItem = { ...rotatedItem, ...availableSlot };
        finalGridItems = [...otherItems, movedAndRotatedItem];
        toast.success(`Rotated ${item.name} and moved it to a new slot.`);
      } else {
        // 5. If no slot is available, move the item to the player's tray
        const { x, y, ...trayItem } = rotatedItem;
        finalGridItems = otherItems; // The item is no longer in the grid
        finalTrayItems.push(trayItem);
        toast.error(`No space to rotate ${item.name}. Moved it to the tray.`);
      }
    }

    // 6. Save the changes to Firestore
    const containerDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId, 'containers', containerId);
    const playerDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    
    const batch = writeBatch(db);
    batch.update(containerDocRef, { gridItems: finalGridItems });
    // Also update the tray in case the item was moved there
    batch.update(playerDocRef, { trayItems: finalTrayItems });
    await batch.commit();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

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
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center flex-grow">
      {/* --- Modals --- */}
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
          inventories={inventories}
          onTradeStarted={handleTradeStarted}
        />
      )}
      
      {showCompendium && (
        <AddFromCompendium
          onClose={() => setShowCompendium(false)}
          players={Object.keys(inventories)}
          dmId={campaign?.dmId}
          playerProfiles={playerProfiles}
          onAddItem={handleAddItem}
        />
      )}

      {editingSettings && (
        <InventorySettings
          onClose={() => setEditingSettings(null)}
          campaignId={campaignId}
          userId={editingSettings.playerId}
          currentSettings={editingSettings.currentSettings}
          isDMInventory={editingSettings.isDMInventory}
        />
      )}

      {showLayoutSettings && (
        <CampaignLayout
          campaign={{ id: campaignId, ...campaign }}
          inventories={inventories}
          playerProfiles={playerProfiles}
          onClose={() => setShowLayoutSettings(false)}
        />
      )}

      {splittingItem && (
        <SplitStack
          item={splittingItem.item}
          onClose={() => setSplittingItem(null)}
          onSplit={(splitAmount) => {
            handleSplitStack(splitAmount);
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

      {/* --- DM-Only Button --- */}
      {campaign?.dmId === user?.uid && (
        <div className="w-full max-w-4xl flex justify-end mb-4 px-4">
            <button 
                onClick={() => setShowLayoutSettings(true)} 
                className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors text-sm"
            >
                Manage Layout
            </button>
        </div>
      )}

      {/* --- Main Content --- */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={pointerWithin}
        dropAnimation={{
            duration: 150,
            easing: 'cubic-bezier(0.18, 1, 0.4, 1)',
        }}
      >
        <div className="w-full flex-grow overflow-auto p-4 space-y-8 pb-24 overscroll-contain">
          {orderedAndVisibleInventories.map(([playerId, inventoryData]) => (
            <PlayerInventory
              key={playerId}
              playerId={playerId}
              inventoryData={inventoryData}
              campaign={campaign}
              playerProfiles={playerProfiles}
              user={user}
              setEditingSettings={setEditingSettings}
              cellSizes={cellSizes}
              gridRefs={gridRefs}
              onContextMenu={handleContextMenu}
              openTrays={openTrays}
              setOpenTrays={setOpenTrays}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div
              style={{
                width: activeItem.dimensions.width,
                height: activeItem.dimensions.height,
              }}
              className={`${getColorForItemType(activeItem.item.type)} rounded-lg text-text-base font-bold p-1 text-center text-xs sm:text-sm flex items-center justify-center shadow-2xl scale-105`}
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
      
      {/* --- Floating Action Buttons --- */}
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