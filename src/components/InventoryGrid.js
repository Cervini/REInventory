import React, { useState, useEffect } from 'react';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import SplitStack from './SplitStack';
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from '../firebase';

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

  // Data fetching logic remains the same
  useEffect(() => {
    if (!campaignId || !user) return;

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

    const unsubscribePromise = fetchData();

    return () => { unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe()); };
  }, [campaignId, user]);

  const handleUpdateItems = (playerId, newItems) => {
    setInventories(prev => ({
        ...prev,
        [playerId]: newItems,
    }));
  };

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
    // Determine the correct player ID to use for both add and edit modes
    const finalPlayerId = itemToEdit ? itemToEdit.playerId : targetPlayerId;
    if (!campaignId || !finalPlayerId) return;

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', finalPlayerId);
    const currentItems = inventories[finalPlayerId] || [];
    let newItems;

    // --- EDIT LOGIC ---
    if (itemToEdit) {
      newItems = currentItems.map(i =>
        (i.id === itemToEdit.item.id ? { ...itemToEdit.item, ...itemData } : i)
      );
    } 
    // --- ADD LOGIC ---
    else {
      // If the new item is stackable, check for an existing stack to merge with
      if (itemData.stackable) {
        const existingItemIndex = currentItems.findIndex(item =>
          item.stackable && item.name.toLowerCase() === itemData.name.toLowerCase()
        );

        // If a matching stack exists, update its quantity
        if (existingItemIndex !== -1) {
          newItems = [...currentItems]; // Make a mutable copy
          const existingItem = newItems[existingItemIndex];
          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + itemData.quantity,
          };
        }
      }
      
      // If no merge happened (because item wasn't stackable or no match was found),
      // add the new item to the array.
      if (!newItems) {
        newItems = [...currentItems, itemData];
      }
    }

    // Optimistically update the local state for a snappy UI
    setInventories(prev => ({
      ...prev,
      [finalPlayerId]: newItems,
    }));

    // Save the final, updated array to Firestore
    await updateDoc(inventoryDocRef, { items: newItems });

    // Reset editing state after submitting
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

    // Double-check for valid split amount
    if (isNaN(amount) || amount <= 0 || amount >= originalItem.quantity) {
      return;
    }

    // 1. The original stack with its quantity reduced
    const updatedOriginalItem = {
      ...originalItem,
      quantity: originalItem.quantity - amount,
    };

    // 2. The new stack with the split-off quantity
    const newItem = {
      ...originalItem,
      id: crypto.randomUUID(), // Must have a new, unique ID
      quantity: amount,
      x: 0, // Place at the top-left corner by default
      y: 0,
    };

    // 3. Update the items array
    const currentItems = inventories[playerId] || [];
    const newItems = currentItems.map(i => 
      (i.id === originalItem.id ? updatedOriginalItem : i)
    );
    newItems.push(newItem);

    // 4. Update local state and Firestore
    setInventories(prev => ({
      ...prev,
      [playerId]: newItems,
    }));

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, { items: newItems });
  };

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
              onUpdateItems={handleUpdateItems}
              onContextMenu={handleContextMenu}
            />
          </div>
        ))}
      </div>
    </div>
  );
}