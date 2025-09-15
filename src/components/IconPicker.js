import React, { useState } from 'react';
import { iconList } from '../icon-list';
import DynamicIcon from './DynamicIcon';

const IconPicker = ({ onSelectIcon, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = iconList.filter(iconName =>
    iconName.toLowerCase().replace(/_/g, ' ').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-30" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Choose an Icon</h3>
        <input
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-4 bg-background border border-surface/50 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
        <div
          className="min-h-0 overflow-auto grid grid-cols-8 gap-4 grid-auto-rows-min"
          style={{ alignContent: 'start' }}
        >
          {filteredIcons.map((iconName) => (
            <button
              key={iconName}
              onClick={() => onSelectIcon(iconName)}
              className="p-2 bg-background rounded-md flex items-center justify-center hover:bg-accent group transition-colors"
              style={{ aspectRatio: '1 / 1' }}
              title={iconName.replace(/_/g, ' ')}
            >
              <DynamicIcon iconName={iconName} className="w-8 h-8 text-text-base group-hover:text-background" />
            </button>
          ))}
        </div>
        <div className="flex justify-end pt-6">
          <button type="button" onClick={onClose} className="bg-surface hover:bg-surface/80 text-text-base font-bold py-2 px-4 rounded transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconPicker;