import React, { useState, useEffect } from 'react';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, collection } from "firebase/firestore";
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

  // Data fetching logic remains the same
  useEffect(() => {
  if (!campaignId || !user) return;

  const fetchData = async () => {
    // First, get the main campaign document
    const campaignDocRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignDocRef);

    if (!campaignSnap.exists()) {
      console.error("Campaign not found!");
      return;
    }
    
    const campaignData = campaignSnap.data();
    setCampaign(campaignData); // Save campaign data
    const isDM = campaignData.dmId === user.uid;

    // If the user is the Dungeon Master...
    if (isDM) {
      // Fetch the entire 'inventories' sub-collection
      const inventoriesColRef = collection(db, 'campaigns', campaignId, 'inventories');
      const unsubscribe = onSnapshot(inventoriesColRef, (snapshot) => {
        const allInventories = {};
        snapshot.forEach(doc => {
          allInventories[doc.id] = doc.data().items || [];
        });
        setInventories(allInventories);
      });
      return unsubscribe; // Return the cleanup function for onSnapshot
    } 
    // If the user is a regular player...
    else {
      // Fetch only their own inventory document
      const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', user.uid);
      const unsubscribe = onSnapshot(inventoryDocRef, (docSnap) => {
        if (docSnap.exists()) {
          // Set inventories state with only this player's data
          setInventories({ [user.uid]: docSnap.data().items || [] });
        }
      });
      return unsubscribe; // Return the cleanup function for onSnapshot
    }
  };

  const unsubscribePromise = fetchData();

  // Cleanup function to handle unsubscribing from the listener
  return () => {
    unsubscribePromise.then(unsubscribe => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
  };
}, [campaignId, user]);

  const handleUpdateItems = (playerId, newItems) => {
    setInventories(prev => ({
        ...prev,
        [playerId]: newItems,
    }));
  };

  const handleContextMenu = (event, item, playerId) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      item: item,
      playerId: playerId,
    });
  };

  const handleDeleteItem = async () => {
    const { item, playerId } = contextMenu;
    if (!item || !playerId) return;

    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', playerId);
    await updateDoc(inventoryDocRef, {
      items: arrayRemove(item)
    });
  };
  
  const handleAddItem = async (newItem, targetPlayerId) => {
    if (!campaignId || !targetPlayerId) return;
    
    // Use the targetPlayerId to update the correct document
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', targetPlayerId);
    
    await updateDoc(inventoryDocRef, {
      items: arrayUnion(newItem)
    }, { merge: true }); // Use merge to create doc if it doesn't exist (edge case)
  };

  const handleCopy = () => { navigator.clipboard.writeText(campaignId); /* ... */ };

  const contextMenuActions = [{ label: 'Delete Item', onClick: handleDeleteItem }];

  return (
    <div className="w-full flex flex-col items-center flex-grow">
      {showAddItem && (
        <AddItem 
          onAddItem={handleAddItem} 
          onClose={() => setShowAddItem(false)} 
          players={Object.keys(inventories)}
          dmId={campaign?.dmId}
        />
      )}
      {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenuActions}
          onClose={() => setContextMenu({ visible: false, position: null, item: null, playerId: null })}
        />
      )}

      {/* Header section */}
      <div className="bg-gray-800 p-2 rounded-md mb-4 flex items-center justify-between w-full max-w-4xl">
        {showAddItem && (
        <AddItem 
          onAddItem={handleAddItem} 
          onClose={() => setShowAddItem(false)} 
          players={Object.keys(inventories)}
          dmId={campaign?.dmId}
        />
        )}
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
            <h2 className="text-lg font-bold text-white mb-2">
              Inventory for: <span className="font-mono text-sm">{user.uid === playerId ? `${campaign?.dmEmail} (You)` : playerId}</span>
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