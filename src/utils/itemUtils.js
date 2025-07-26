export const itemTypeOptions = [
  { type: 'Weapon', color: 'bg-red-900' },
  { type: 'Armor', color: 'bg-sky-800' },
  { type: 'Potion', color: 'bg-teal-800' },
  { type: 'Magic', color: 'bg-purple-900' },
  { type: 'Treasure', color: 'bg-amber-700' },
  { type: 'Gear', color: 'bg-lime-900' },
  { type: 'Ammunition', color: 'bg-yellow-900' },
  { type: 'Tool', color: 'bg-indigo-900' },
  { type: 'Other', color: 'bg-stone-700' },
];

// This helper function remains the same, but it's more powerful now.
export function getColorForItemType(type) {
  const option = itemTypeOptions.find(opt => opt.type === type);
  return option ? option.color : 'bg-stone-700'; // Default to a neutral color
}