import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useCompendium } from '../hooks/useCompendium';
import Spinner from './Spinner';
import { getColorForItemType } from '../utils/itemUtils';

export default function AddFromCompendiumModal({ onClose, onAddItem, players, dmId, playerProfiles }) {
    const { allItems, isLoading } = useCompendium();
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [targetPlayerId, setTargetPlayerId] = useState(dmId || '');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSelect = (item) => {
        setSelectedItem(item);
        setQuantity(item.quantity || 1);
    };

    const handleConfirm = () => {
        if (!selectedItem || !targetPlayerId) {
            toast.error("Please select an item and a player.");
            return;
        }
        
        // Create a copy of the compendium item, giving it a new unique ID
        const newItem = {
            ...selectedItem,
            id: crypto.randomUUID(),
            quantity: parseInt(quantity, 10),
        };
        onAddItem(newItem, targetPlayerId);
        onClose();
    };

    const filteredItems = allItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Confirmation screen
    if (selectedItem) {
        return (
            <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Add "{selectedItem.name}"</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-text-muted">Quantity</label>
                            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-text-muted">Add to Player</label>
                            <select value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)} className="w-full p-2 bg-background border border-surface/50 rounded-md">
                                {players.map(pId => <option key={pId} value={pId}>{playerProfiles[pId]?.displayName || pId}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-6">
                        <button type="button" onClick={() => setSelectedItem(null)} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Back</button>
                        <button type="button" onClick={handleConfirm} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-4 rounded transition-colors">Confirm Add</button>
                    </div>
                </div>
            </div>
        )
    }

    // Item browser
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Add from Compendium</h3>
                <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 mb-4 bg-background border border-surface/50 rounded-md" />
                <div className="flex-grow overflow-auto">
                    {isLoading ? <Spinner /> : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredItems.map(item => (
                                <button key={item.id} onClick={() => handleSelect(item)} className={`${getColorForItemType(item.type)} rounded-lg p-3 text-text-base border border-surface/50 flex flex-col justify-between text-left`}>
                                    <div className="min-w-0">
                                        <h4 className="font-bold truncate" title={item.name}>{item.name}</h4>
                                        <p className="text-xs text-text-muted">{item.rarity || 'Common'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="flex justify-end pt-6">
                    <button type="button" onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
}