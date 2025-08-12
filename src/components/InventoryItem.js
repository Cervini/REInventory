import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getColorForItemType } from '../utils/itemUtils';

export default function InventoryItem({ item, onContextMenu, playerId, source, cellSize, containerId }) {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { ownerId: playerId, item, source, containerId },
  });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: item.id,
    data: { ownerId: playerId, item, source, containerId },
  });

  const style = {
    gridColumn: source === 'grid' ? `${item.x + 1} / span ${item.w}` : undefined,
    gridRow: source === 'grid' ? `${item.y + 1} / span ${item.h}` : undefined,
    
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,

    visibility: isDragging ? 'hidden' : 'visible',
    
    zIndex: isDragging ? 20 : 10,
    width: source === 'tray' ? '100%' : undefined,
    height: source === 'tray' ? '100%' : undefined,
  };

  const effectiveCellWidth = cellSize?.width > 0 ? cellSize.width : 80;
  const effectiveCellHeight = cellSize?.height > 0 ? cellSize.height : 80;
  const isTextVisible = effectiveCellWidth * item.w > 20 && effectiveCellHeight * item.h > 20;

  const tooltipContent = `
    <div style="text-align: left;">
      <strong style="font-size: 1.1em;">${item.name}</strong>
      <hr style="margin: 5px 0; border-color: #555;" />
      <div>${item.description || 'No description.'}</div>
    </div>
  `;

  return (
    <div
      ref={(node) => {
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
      }}
      style={style}
      className="relative flex"
      onContextMenu={(e) => onContextMenu(e, item, source)}
      data-tooltip-id="item-tooltip"
      data-tooltip-html={tooltipContent}
    >
      <div
        {...listeners}
        {...attributes}
        className={`${getColorForItemType(item.type)} w-full h-full rounded-lg cursor-grab active:cursor-grabbing select-none border border-surface/50`}
      >
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
    </div>
  );
}