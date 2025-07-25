import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { getColorForItemType } from '../utils/itemUtils';

const TEXT_VISIBILITY_THRESHOLD = { width: 28, height: 28 };

export default function InventoryItem({ item, onContextMenu, playerId, isDM, source, cellSize }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: item.id,
    data: { ownerId: playerId, item: item, source: source },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 10,
    opacity: isDragging ? 0 : 1,
  } : undefined;

  let wrapperStyle = {};
  if (source === 'grid') {
    wrapperStyle = {
      gridColumn: `${item.x + 1} / span ${item.w}`,
      gridRow: `${item.y + 1} / span ${item.h}`,
    };
  }

  // Calculate visibility directly and reliably from the prop
  const itemPixelWidth = (cellSize?.width || 0) * item.w;
  const itemPixelHeight = (cellSize?.height || 0) * item.h;
  const isTextVisible = itemPixelWidth > TEXT_VISIBILITY_THRESHOLD.width && itemPixelHeight > TEXT_VISIBILITY_THRESHOLD.height;

  const lastTap = React.useRef(0);

  const handleClick = (event) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      event.preventDefault();
      onContextMenu(event, item, source);
    }
    lastTap.current = now;
  };
  
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
        ${isDM ? `<strong>Cost:</strong> ${item.cost || 'N/A'}<br/>` : ''}
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
      ref={setNodeRef} 
      style={{...wrapperStyle, ...style}} 
      className={`relative border border-surface/50 rounded-lg ${source === 'tray' ? 'w-full h-full' : ''}`}
      onContextMenu={(e) => onContextMenu(e, item, source)}
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
      data-tooltip-place="top"
      title={item.name}
    >
      {/* This is the main visible element with the color */}
      <div
        {...listeners}
        {...attributes}
        onClick={handleClick}
        className={`${getColorForItemType(item.type)} w-full h-full rounded-lg cursor-grab active:cursor-grabbing select-none transition-all duration-200 touch-none`}
      >
        {/* This div is intentionally empty and only provides the background color */}
      </div>

      {/* THIS IS THE FIX: The text is now in a separate, absolutely positioned container */}
      {/* This prevents it from affecting the parent's size in any way. */}
      <div className="absolute inset-0 p-1 flex items-center justify-center pointer-events-none">
        {isTextVisible && (
          <span className="truncate text-text-base font-bold text-xs sm:text-sm">
            {item.name}
          </span>
        )}
      </div>
        
      {item.stackable && item.quantity > 1 && isTextVisible && (
        <span className="absolute bottom-0 right-1 text-lg font-black text-text-base pointer-events-none" style={{ WebkitTextStroke: '1px hsl(var(--color-background))' }}>
          {item.quantity}
        </span>
      )}
    </div>
  );
}