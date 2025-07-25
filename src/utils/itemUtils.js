const typeColorMap = {
  Weapon: 'bg-red-900',
  Armor: 'bg-sky-800',
  Potion: 'bg-teal-800',
  Magic: 'bg-purple-900',
  Treasure: 'bg-amber-700',
  Gear: 'bg-stone-700',
  Misc: 'bg-stone-700', // Default/fallback
};

// This function takes an item type and returns the corresponding color class.
export function getColorForItemType(type) {
  return typeColorMap[type] || typeColorMap['Misc'];
}