import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

const TEXT_VISIBILITY_THRESHOLD = { width: 28, height: 28 };

export default function InventoryItem({ item, onContextMenu, playerId, isDM, source }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: item.id,
    data: { ownerId: playerId, item: item, source: source },
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const itemRef = useRef(null);
  const lastTap = useRef(0); // For detecting double taps

  const setRefs = (node) => {
    itemRef.current = node;
    setNodeRef(node);
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      }
    });
    if (itemRef.current) {
      resizeObserver.observe(itemRef.current);
    }
    return () => {
      if (itemRef.current) {
        resizeObserver.unobserve(itemRef.current);
      }
    };
  }, []);

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

  // This handler detects if a click/tap is a double tap
  const handleClick = (event) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      event.preventDefault();
      onContextMenu(event, item);
    }
    // A single tap will be handled by the tooltip library's openOnClick
    lastTap.current = now;
  };
  
  const tooltipContent = `
    <div style="text-align: left;">
      <strong style="font-size: 1.1em;">${item.name}</strong>
      <div style="font-size: 0.9em;">
        ${isDM ? `<strong>Cost:</strong> ${item.cost || 'N/A'}<br/>` : ''}
        <strong>Weight:</strong> ${item.weight || 'N/A'}
      </div>
      <hr style="margin: 5px 0; border-color: #555;" />
      <div style="font-size: 0.9em;">${item.description || 'No description.'}</div>
    </div>
  `;

  return (
    <div 
      ref={setRefs} 
      style={{...wrapperStyle, ...style}} 
      className={`relative border border-surface/50 rounded-lg ${source === 'tray' ? 'w-full h-full' : ''}`}
      onContextMenu={(e) => onContextMenu(e, item)} // For desktop right-click
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
      data-tooltip-place="top"
    >
      {/* The listeners for drag-and-drop are now on the main div */}
      <div
        {...listeners}
        {...attributes}
        onClick={handleClick}
        className={`${item.color} w-full h-full rounded-lg text-text-base font-bold p-1 text-center text-xs sm:text-sm cursor-grab active:cursor-grabbing select-none flex items-center justify-center transition-all duration-200 min-w-0`}
      >
        {size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && (
          <span className="truncate">{item.name}</span>
        )}
        
        {item.stackable && item.quantity > 1 && size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && (
          <span className="absolute bottom-0 right-1 text-lg font-black text-text-base" style={{ WebkitTextStroke: '1px hsl(var(--color-background))' }}>
            {item.quantity}
          </span>
        )}
      </div>
    </div>
  );
}