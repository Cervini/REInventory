import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

const TEXT_VISIBILITY_THRESHOLD = {
  // Text disappears if wrapper's smaller than this
  width: 50,
  height: 50,
};

export default function InventoryItem({ item, onContextMenu, playerId }) {
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

  return (
    // apply combined refs
    <div ref={setRefs} style={{...wrapperStyle, ...style}} className="relative" onContextMenu={(e) => onContextMenu(e, item)}>
      <div
        {...listeners}
        {...attributes}
        className={`${item.color} absolute inset-0 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)] rounded-lg text-white font-bold p-1 text-center text-xs sm:text-sm cursor-grab break-words overflow-hidden`}
      >
        {/* Conditional render */}
        {size.width > TEXT_VISIBILITY_THRESHOLD.width && size.height > TEXT_VISIBILITY_THRESHOLD.height && item.name}
        {item.stackable && item.quantity > 1 && (
          <span className="absolute bottom-0 right-1 text-lg font-black text-white" style={{ WebkitTextStroke: '1px black' }}>
            {item.quantity}
          </span>
        )}
      </div>
    </div>
  );
}