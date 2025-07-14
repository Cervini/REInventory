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
        className="fixed bg-gray-700 text-white rounded-md shadow-lg py-1 z-50"
      >
        <ul>
          {actions.map((action, index) => (
            <li key={index}>
              <button
                onClick={() => {
                  action.onClick();
                  onClose(); // Automatically close menu after action
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-500"
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