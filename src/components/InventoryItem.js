import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useLongPress } from 'use-long-press';

const TEXT_VISIBILITY_THRESHOLD = {
  // Text disappears if wrapper's smaller than this
  width: 30,
  height: 30,
};

export default function InventoryItem({ item, onContextMenu, playerId, isDM, source }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: item.id,
    data: {
      ownerId: playerId,
      item: item,
      source: source,
    },
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const itemRef = useRef(null); // Ref for our measurement

  const setRefs = (node) => {
    itemRef.current = node;
    setNodeRef(node);
  };

  useEffect(() => {
    // Observer that updates our state whenever the size changes
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      }
    });

    // Start observing the item's div
    if (itemRef.current) {
      resizeObserver.observe(itemRef.current);
    }

    // Cleanup function: stop observing when the component is unmounted
    return () => {
      if (itemRef.current) {
        resizeObserver.unobserve(itemRef.current);
      }
    };
  }, []); // The empty array means this effect runs only once

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

  const bind = useLongPress((event) => {
    onContextMenu(event, item); 
  }, { detect: 'touch' });

  const tooltipContent = `
    <div style="text-align: left;">
      <strong style="font-size: 1.1em;">${item.name}</strong>
      <div style="font-style: italic; color: #ccc; margin-bottom: 5px;">${item.type || 'Misc'}</div>
      <div style="font-size: 0.9em;">
        ${isDM ? `<strong>Cost:</strong> ${item.cost || 'N/A'}<br/>` : ''}
        <strong>Weight:</strong> ${item.weight || 'N/A'}
      </div>
      <hr style="margin: 5px 0; border-color: #555;" />
      <div style="font-size: 0.9em;">${item.description || 'No description.'}</div>
    </div>
  `;

  return (
    // 1. This is the main container that gets placed on the grid.
    // It now has the border shadow and rounded corners for a seamless look.
    <div 
      ref={setRefs} 
      style={{...wrapperStyle, ...style}} 
      className={`relative shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)] rounded-lg ${source === 'tray' ? 'w-full h-full' : ''}`}
      onContextMenu={(e) => onContextMenu(e, item)}
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
      data-tooltip-place="top"
    >
      {/* 2. This is the visible item body. It takes up 100% of the space. */}
      {/* The long-press for the context menu is attached here. */}
      <div
        {...bind()}
        className={`${item.color} w-full h-full rounded-lg text-white font-bold p-1 text-center text-xs sm:text-sm cursor-pointer break-words overflow-hidden flex items-center justify-center select-none`}
      >
        {/* The name is now centered across the full width of the item */}
        {size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && item.name}
        
        {/* The quantity display */}
        {item.stackable && item.quantity > 1 && size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && (
          <span className="absolute bottom-0 right-1 text-lg font-black text-white" style={{ WebkitTextStroke: '1px black' }}>
            {item.quantity}
          </span>
        )}
      </div>

      {/* 3. This is the invisible drag handle. 
          It's positioned absolutely on top of the right half of the item.
          The drag listeners are attached here.
      */}
      <div
        {...listeners}
        {...attributes}
        className="absolute top-0 right-0 h-full w-1/2 cursor-grab rounded-r-lg transition-colors duration-200 hover:bg-white/10"
      ></div>
    </div>
  );
}