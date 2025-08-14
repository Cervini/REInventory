import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import AddItem from './AddItem';
import Spinner from './Spinner';
import ContextMenu from './ContextMenu';
import { getColorForItemType, itemTypeOptions } from '../utils/itemUtils';

const rarityOptions = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];

export default function Compendium({ onClose }) {
  const [globalItems, setGlobalItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [activeTab, setActiveTab] = useState('custom');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState(null);
  const [activeRarity, setActiveRarity] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, actions: [] });
  const [itemToCustomize, setItemToCustomize] = useState(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const globalUnsubscribe = onSnapshot(collection(db, 'globalCompendium'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalItems(items);
    });

    const customUnsubscribe = onSnapshot(collection(db, 'compendiums', currentUser.uid, 'masterItems'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomItems(items);
      setIsLoading(false);
    });

    return () => {
      globalUnsubscribe();
      customUnsubscribe();
    };
  }, [currentUser]);

  const filteredItems = useMemo(() => {
    const sourceItems = activeTab === 'custom' ? customItems : globalItems;
    
    // 2. Apply search and filters to the selected list
    return sourceItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = !activeType || item.type === activeType;
      const rarityMatch = !activeRarity || item.rarity === activeRarity;
      return nameMatch && typeMatch && rarityMatch;
    });
  }, [activeTab, customItems, globalItems, searchTerm, activeType, activeRarity]);
  
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    // This feature should only work on the "Global Compendium" tab
    if (activeTab !== 'global') return;

    setContextMenu({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      actions: [
        {
          label: 'Create Custom Version',
          onClick: () => {
            // Set the item to customize and show the AddItem modal
            setItemToCustomize(item);
            setShowAddItem(true);
          },
        },
      ],
    });
  };

  const handleAddItem = async (itemData) => {
    const customItemsRef = collection(db, 'compendiums', currentUser.uid, 'masterItems');
    try {
      await addDoc(customItemsRef, itemData);
      toast.success("Custom item saved.");
    } catch (error) {
      toast.error("Failed to save custom item.");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'compendiums', currentUser.uid, 'masterItems', itemId));
      toast.success("Custom item deleted.");
    } catch (error) {
      toast.error("Failed to delete item.");
    }
  };

  const renderItemList = (items) => {
    if (isLoading) return <Spinner />;
    if (items.length === 0) {
      return <p className="text-center text-text-muted italic">No items match your filters.</p>;
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => {
          const tooltipContent = `
            <div style="text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <strong style="font-size: 1.1em;">${item.name}</strong>
                <span style="font-size: 0.9em; color: #ccc; font-style: italic; margin-left: 10px;">${item.rarity || 'Common'}</span>
              </div>
              <div style="font-size: 0.9em; color: #ccc; margin-bottom: 5px;">
                ${item.type || 'Misc'} ${item.attunement && item.attunement !== 'No' ? `(Requires Attunement)` : ''}
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

              ${item.armorStats ? `
                <div style="font-size: 0.9em; margin-top: 5px;">
                  <strong>AC:</strong> ${item.armorStats.armorClass || 'N/A'}<br/>
                  <strong>Type:</strong> ${item.armorStats.armorType || 'N/A'}<br/>
                  ${item.armorStats.strengthRequirement > 0 ? `<strong>Strength:</strong> ${item.armorStats.strengthRequirement}<br/>` : ''}
                  ${item.armorStats.stealthDisadvantage ? `<em>Stealth Disadvantage</em>` : ''}
                </div>
              ` : ''}

              <hr style="margin: 8px 0; border-color: #555;" />
              <div style="font-size: 0.9em; max-height: 150px; overflow-y: auto; white-space: pre-wrap;">${item.description || 'No description.'}</div>
            </div>
          `;

          return (
            <div 
              key={item.id} 
              className={`${getColorForItemType(item.type)} rounded-lg p-3 text-text-base border border-surface/50 flex flex-col justify-between`}
              onContextMenu={(e) => handleContextMenu(e, item)}
              data-tooltip-id="item-tooltip"
              data-tooltip-html={tooltipContent}
              data-tooltip-place="top"
            >
              <div className="min-w-0">
                <h3 className="font-bold truncate" title={item.name}>{item.name}</h3>
                <p className="text-xs text-text-muted">{item.w}x{item.h} | {item.weight || 'N/A'}</p>
              </div>
              {activeTab === 'custom' && (
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
          onClose={() => {
            setShowAddItem(false);
            setItemToCustomize(null); // Clear the item when closing
          }} 
          isDM={true}
          itemToEdit={itemToCustomize ? { item: itemToCustomize } : null} 
        />
      )}

      {contextMenu.visible && (
        <ContextMenu
          menuPosition={contextMenu.position}
          actions={contextMenu.actions}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-fantasy text-accent">Item Compendium</h1>
        <button onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">
          Back to Campaigns
        </button>
      </div>

      <div className="flex border-b border-surface mb-4">
        <button onClick={() => setActiveTab('custom')} className={`py-2 px-4 font-bold ${activeTab === 'custom' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}>
          My Custom Items
        </button>
        <button onClick={() => setActiveTab('global')} className={`py-2 px-4 font-bold ${activeTab === 'global' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}>
          Global Compendium
        </button>
        <div className="flex-grow border-b border-surface flex justify-end items-center space-x-2 pb-1">
            <button 
                onClick={() => setShowFilters(prev => !prev)} 
                className="bg-surface hover:bg-surface/80 text-text-base font-bold py-1 px-3 rounded text-sm"
                aria-label="Toggle Filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={() => setShowAddItem(true)} className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-background font-bold py-1 px-3 rounded text-sm">
                + Add Custom Item
            </button>
        </div>
      </div>

      {/* Conditionally render the filter section */}
      {showFilters && (
        <div className="mb-4 p-4 bg-surface/50 rounded-lg border border-surface/50 space-y-4">
          <input 
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="space-y-2">
            <div>
              <span className="text-sm font-bold text-text-muted mr-2">Type:</span>
              <button onClick={() => setActiveType(null)} className={`px-2 py-1 text-xs rounded-full ${!activeType ? 'bg-accent text-background' : 'bg-surface'}`}>All</button>
              {itemTypeOptions.map(opt => (
                <button key={opt.type} onClick={() => setActiveType(opt.type)} className={`px-2 py-1 text-xs rounded-full ml-1 ${activeType === opt.type ? 'bg-accent text-background' : 'bg-surface'}`}>{opt.type}</button>
              ))}
            </div>
            <div>
              <span className="text-sm font-bold text-text-muted mr-2">Rarity:</span>
              <button onClick={() => setActiveRarity(null)} className={`px-2 py-1 text-xs rounded-full ${!activeRarity ? 'bg-accent text-background' : 'bg-surface'}`}>All</button>
              {rarityOptions.map(rarity => (
                <button key={rarity} onClick={() => setActiveRarity(rarity)} className={`px-2 py-1 text-xs rounded-full ml-1 ${activeRarity === rarity ? 'bg-accent text-background' : 'bg-surface'}`}>{rarity}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow overflow-auto p-4 bg-background/50 rounded-lg border border-surface/50">
        {renderItemList(filteredItems)}
      </div>
    </div>
  );
}