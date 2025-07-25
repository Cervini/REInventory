export const itemTypeOptions = [
  { type: 'Weapon', color: 'bg-red-900' },
  { type: 'Armor', color: 'bg-sky-800' },
  { type: 'Potion', color: 'bg-teal-800' },
  { type: 'Magic', color: 'bg-purple-900' },
  { type: 'Ammunition', color: 'bg-stone-700' },
  { type: 'Tool', color: 'bg-stone-700' },
  { type: 'Treasure', color: 'bg-amber-700' },
  { type: 'Gear', color: 'bg-stone-700' },
  { type: 'Other', color: 'bg-stone-700' },
];

// TODO: better colors

// This helper function remains the same, but it's more powerful now.
export function getColorForItemType(type) {
  const option = itemTypeOptions.find(opt => opt.type === type);
  return option ? option.color : 'bg-stone-700'; // Default to a neutral color
}