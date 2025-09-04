import React, { useState, useRef } from 'react';

export default function ContextMenu({ menuPosition, actions, onClose }) {
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const closeTimer = useRef(null);

  if (!menuPosition) return null;

  const menuStyle = {
    top: `${menuPosition.y}px`,
    left: `${menuPosition.x}px`,
  };

  /**
   * Handles the mouse entering a menu item. If the item has a submenu,
   * it sets that submenu as active, making it visible.
   * @param {number} index - The index of the action item being hovered over.
   */
  const handleMouseEnter = (index) => {
    // If there's a pending timer to close a submenu, cancel it
    clearTimeout(closeTimer.current);
    if (actions[index].submenu) {
      setActiveSubmenu(index);
    }
  };

  /**
   * Handles the mouse leaving the main context menu area. It sets a short
   * timer to close any active submenu, giving the user a moment to move their
   * cursor from the main menu to the submenu without it disappearing.
   */
  const handleMouseLeave = () => {
    // Set a short timer to close the submenu, giving the user time to move their cursor
    closeTimer.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 200); // 200 milliseconds delay
  };


  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      
      <div
        style={menuStyle}
        className="fixed bg-gradient-to-b from-surface to-background text-text-base rounded-md shadow-lg py-1 z-50 border border-accent/20"
        onMouseLeave={handleMouseLeave} // Close submenu when leaving the entire menu area
      >
        <ul>
          {actions.map((action, index) => (
            <li 
              key={index} 
              className="relative"
              onMouseEnter={() => handleMouseEnter(index)}
            >
              <button
                onClick={() => {
                  if (!action.submenu) {
                    action.onClick();
                    onClose();
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-background transition-colors duration-200 flex justify-between items-center"
              >
                <span>{action.label}</span>
                {action.submenu && <span>&raquo;</span>}
              </button>

              {/* The Submenu */}
              {action.submenu && activeSubmenu === index && (
                <div 
                  className="absolute left-full top-0 ml-1 w-48 bg-gradient-to-b from-surface to-background rounded-md shadow-lg py-1 border border-accent/20"
                  // Also manage hover state on the submenu itself to keep it open
                  onMouseEnter={() => clearTimeout(closeTimer.current)}
                >
                  <ul>
                    {action.submenu.map((subAction, subIndex) => (
                      <li key={subIndex}>
                        <button
                          onClick={() => {
                            subAction.onClick();
                            onClose();
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-background transition-colors duration-200"
                        >
                          {subAction.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}