import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getColorForItemType } from '../utils/itemUtils';
import { useLongPress } from '../hooks/useLongPress';
import { generateItemTooltip } from '../utils/itemUtils';

/**
 * Renders a single draggable and droppable inventory item.
 * It handles its own position in a grid or tray, visibility while dragging,
 * and displays a detailed tooltip on hover.
 * @param {object} props - The component props.
 * @param {object} props.item - The item data object.
 * @param {Function} props.onContextMenu - The context menu handler.
 * @param {string} props.playerId - The ID of the player who owns the item.
 * @param {('grid'|'tray')} props.source - The location of the item.
 * @param {object} props.cellSize - The calculated size of a grid cell.
 * @param {string} props.containerId - The ID of the container holding the item.
 * @returns {JSX.Element}
 */
export default function InventoryItem({ item, onContextMenu, playerId, source, cellSize, containerId, isViewerDM }) {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { ownerId: playerId, item, source, containerId },
  });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: item.id,
    data: { ownerId: playerId, item, source, containerId },
  });

  const longPressEvents = useLongPress((event) => {
    event.preventDefault();
    onContextMenu(event, item, source);
  }, 500); // 500ms delay for the long press

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

  return (
    <div
      ref={(node) => {
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
      }}
      style={style}
      className="relative flex"
      data-tooltip-id="item-tooltip"
      data-tooltip-html={generateItemTooltip(item, isViewerDM)}
      {...longPressEvents}
    >
      <div
        {...listeners}
        {...attributes}
        className={`${getColorForItemType(item.type)} w-full h-full rounded-lg cursor-grab active:cursor-grabbing select-none border border-surface/50 touch-none`}
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