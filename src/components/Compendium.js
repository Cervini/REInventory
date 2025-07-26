import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import AddItem from './AddItem';
import Spinner from './Spinner';
import { getColorForItemType } from '../utils/itemUtils';

export default function Compendium({ onClose }) {
  const [globalItems, setGlobalItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' or 'global'

  const currentUser = auth.currentUser;

  // Fetch both global and custom items
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    // Fetch global items (read-only)
    const globalUnsubscribe = onSnapshot(collection(db, 'globalCompendium'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalItems(items);
    });

    // Fetch user's custom items (writable)
    const customUnsubscribe = onSnapshot(collection(db, 'compendiums', currentUser.uid, 'masterItems'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomItems(items);
      setIsLoading(false); // Stop loading after custom items are fetched
    });

    return () => {
      globalUnsubscribe();
      customUnsubscribe();
    };
  }, [currentUser]);

  const handleAddItem = async (itemData) => {
    const customItemsRef = collection(db, 'compendiums', currentUser.uid, 'masterItems');
    try {
      await addDoc(customItemsRef, itemData);
      toast.success("Custom item saved.");
    } catch (error) {
      toast.error("Failed to save custom item.");
      console.error(error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure? This will permanently delete the master item.")) return;
    try {
      const itemDocRef = doc(db, 'compendiums', currentUser.uid, 'masterItems', itemId);
      await deleteDoc(itemDocRef);
      toast.success("Custom item deleted.");
    } catch (error) {
      toast.error("Failed to delete item.");
    }
  };

  const renderItemList = (items, isCustom) => {
    if (isLoading) return <Spinner />;
    if (items.length === 0) {
      return <p className="text-center text-text-muted italic">{isCustom ? "Your custom compendium is empty." : "No global items found."}</p>;
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => {
          // 1. We build the same tooltip content string here
          const tooltipContent = `
            <div style="text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <strong style="font-size: 1.1em;">${item.name}</strong>
                <span style="font-size: 0.9em; color: #ccc; font-style: italic;">${item.rarity || 'Common'}</span>
              </div>
              <div style="font-size: 0.9em; color: #ccc; margin-bottom: 5px;">
                ${item.type || 'Misc'} ${item.attunement !== 'No' ? `(Requires Attunement)` : ''}
              </div>
              <div style="font-size: 0.9em;">
                <strong>Cost:</strong> ${item.cost || 'N/A'}<br/>
                <strong>Weight:</strong> ${item.weight || 'N/A'}
              </div>
              ${item.weaponStats ? `
                <div style="font-size: 0.9em; margin-top: 5px;">
                  <strong>Damage:</strong> ${item.weaponStats.damage || ''} ${item.weaponStats.damageType || ''}<br/>
                  <strong>Properties:</strong> ${item.weaponStats.properties || 'None'}
                </div>
              ` : ''}
              <hr style="margin: 8px 0; border-color: #555;" />
              <div style="font-size: 0.9em; max-height: 150px; overflow-y: auto;">${item.description || 'No description.'}</div>
            </div>
          `;

          return (
            <div 
              key={item.id} 
              className={`${getColorForItemType(item.type)} rounded-lg p-3 text-text-base border border-surface/50 flex flex-col justify-between`}
              // 2. Add the data-tooltip attributes to this div
              data-tooltip-id="item-tooltip"
              data-tooltip-html={tooltipContent}
              data-tooltip-place="top"
            >
              <div className="min-w-0">
                <h3 className="font-bold truncate" title={item.name}>{item.name}</h3>
                <p className="text-xs text-text-muted">{item.w}x{item.h} | {item.weight || 'N/A'}</p>
              </div>
              {isCustom && (
                <button 
                  onClick={() => handleDeleteItem(item.id)} 
                  className="mt-2 text-xs bg-destructive/50 hover:bg-destructive text-text-base px-2 py-1 rounded self-end transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      {showAddItem && (
        <AddItem
          onAddItem={handleAddItem}
          onClose={() => setShowAddItem(false)}
          isDM={true}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-fantasy text-accent">Item Compendium</h1>
        <button onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">
          Back to Campaigns
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface mb-4">
        <button onClick={() => setActiveTab('custom')} className={`py-2 px-4 font-bold ${activeTab === 'custom' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}>
          My Custom Items
        </button>
        <button onClick={() => setActiveTab('global')} className={`py-2 px-4 font-bold ${activeTab === 'global' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}>
          Global Compendium
        </button>
        <div className="flex-grow border-b border-surface flex justify-end">
            <button onClick={() => setShowAddItem(true)} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-1 px-3 rounded mb-1 text-sm">
                + Add Custom Item
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-auto p-4 bg-background/50 rounded-lg border border-surface/50">
        {activeTab === 'custom' ? renderItemList(customItems, true) : renderItemList(globalItems, false)}
      </div>
    </div>
  );
}