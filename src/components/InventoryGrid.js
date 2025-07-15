import React, { useState, useEffect } from 'react';
import PlayerInventoryGrid from './PlayerInventoryGrid';
import AddItem from './AddItem';
import ContextMenu from './ContextMenu';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
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
  
  const handleStartEdit = () => {
    if (!contextMenu.item) return;
    setItemToEdit({ 
      item: contextMenu.item,
      playerId: contextMenu.playerId 
    });
    setShowAddItem(true); // Open the form
  };

  const handleAddItem = async (itemData, targetPlayerId) => {
    // If we are editing, the player ID comes from the `itemToEdit` state.
    // Otherwise, it comes from the form's dropdown.
    const finalPlayerId = itemToEdit ? itemToEdit.playerId : targetPlayerId;

    if (!campaignId || !finalPlayerId) return;
    
    const inventoryDocRef = doc(db, 'campaigns', campaignId, 'inventories', finalPlayerId);

    // If editing an existing item...
    if (itemToEdit) {
      const currentItems = inventories[finalPlayerId] || [];
      // Create a new array with the old item replaced by the updated one
      const newItems = currentItems.map(i => 
        (i.id === itemToEdit.item.id ? { ...i, ...itemData } : i)
      );
      await updateDoc(inventoryDocRef, { items: newItems });
    } 
    // If adding a new item...
    else {
      await updateDoc(inventoryDocRef, {
        items: arrayUnion(itemData)
      }, { merge: true });
    }

    // Reset state after submitting
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

  const contextMenuActions = [
    { label: 'Edit Item', onClick: handleStartEdit },
    { label: 'Delete Item', onClick: handleDeleteItem },
  ];

  return (
    <div className="w-full flex flex-col items-center flex-grow">
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
      {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenuActions}
          onClose={() => setContextMenu({ visible: false, position: null, item: null, playerId: null })}
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