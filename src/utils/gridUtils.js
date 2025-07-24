export function outOfBounds(X, Y, item, gridWidth, gridHeight) {
  if (X < 0 || X > gridWidth - item.w || Y < 0 || Y > gridHeight - item.h) {
    return true;
  }
  return false;
}
export function occupiedTiles(X, Y, W, H) {
    let set = new Set();
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) set.add(`${X + i},${Y + j}`);
    return set;
}

export function onOtherItem(X, Y, activeItem, passiveItem) {
    let set1 = occupiedTiles(X, Y, activeItem.w, activeItem.h);
    let set2 = occupiedTiles(passiveItem.x, passiveItem.y, passiveItem.w, passiveItem.h);
    for (const tile of set1) { if (set2.has(tile)) return true; }
    return false;
}

export function findFirstAvailableSlot(items, newItem, gridWidth, gridHeight) {
  for (let y = 0; y <= gridHeight - newItem.h; y++) {
    for (let x = 0; x <= gridWidth - newItem.w; x++) {
      const isColliding = items.some(existingItem => 
        onOtherItem(x, y, newItem, existingItem)
      );
      if (!isColliding) {
        return { x, y };
      }
    }
  }
  return null;
}