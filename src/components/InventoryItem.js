import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useLongPress } from 'use-long-press';

const TEXT_VISIBILITY_THRESHOLD = {
  // Text disappears if wrapper's smaller than this
  width: 50,
  height: 50,
};

export default function InventoryItem({ item, onContextMenu, playerId, isDM }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: item.id,
    data: {
      ownerId: playerId,
      item: item,
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

  const wrapperStyle = {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  };

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
    <div 
      // The main container still needs the setNodeRef ref from useDraggable
      ref={setRefs} 
      style={{...wrapperStyle, ...style}} 
      className="relative flex" // Use flex to help position the handle
      onContextMenu={(e) => onContextMenu(e, item)}
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
      data-tooltip-place="top"
    >
      {/* This div now takes up most of the space and is NOT draggable */}
      <div
        // We REMOVED the {...listeners} and {...attributes} from this div
        {...bind()} // The long-press binding can stay here
        className={`${item.color} flex-grow shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)] rounded-l-lg text-white font-bold p-1 text-center text-xs sm:text-sm break-words overflow-hidden flex items-center justify-center`}
      >
        {size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && item.name}
        {item.stackable && item.quantity > 1 && (
          <span className="absolute bottom-0 right-1 text-lg font-black text-white" style={{ WebkitTextStroke: '1px black' }}>
            {item.quantity}
          </span>
        )}
      </div>

      {/* This new button is the DRAG HANDLE. 
        It gets the listeners and a grab cursor.
      */}
      <button
        {...listeners}
        {...attributes}
        type="button"
        className={`${item.color} flex-shrink-0 w-6 flex items-center justify-center rounded-r-lg shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing`}
      >
        {/* Simple SVG for the drag handle icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}