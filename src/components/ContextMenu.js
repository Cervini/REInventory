import React from 'react';

export default function ContextMenu({ menuPosition, actions, onClose }) {
  if (!menuPosition) return null;

  const menuStyle = {
    top: `${menuPosition.y}px`,
    left: `${menuPosition.x}px`,
  };

  return (
    <>
      {/* This backdrop is a full-screen, transparent div that closes the menu when clicked */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
        onContextMenu={(e) => { e.preventDefault(); onClose(); }} // Also close on right-click
      />
      
      {/* The actual menu */}
      <div
        style={menuStyle}
        className="fixed bg-gradient-to-b from-surface to-background text-text-base rounded-md shadow-lg py-1 z-50 border border-accent/20"
      >
        <ul>
          {actions.map((action, index) => (
            <li key={index}>
              <button
                onClick={() => {
                  action.onClick();
                  onClose(); // Automatically close menu after action
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-background transition-colors duration-200"
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}