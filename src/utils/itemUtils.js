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

/**
 * Gives the tailwind code associated with the item type
 * @param {string} type The type of the item
 * @returns {string} The tailwind code for the color associated with the type of the item or `bg-stone-700` if there is no correspondence
 */
export function getColorForItemType(type) {
  const option = itemTypeOptions.find(opt => opt.type === type);
  return option ? option.color : 'bg-stone-700';
}

/**
 * Generates the HTML content for an item's tooltip.
 * @param {object} item - The item object.
 * @returns {string} The HTML string for the tooltip.
 */
export const generateItemTooltip = (item) => {
  if (!item) return '';

  return `
    <div style="text-align: left;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <strong style="font-size: 1.1em;">${item.name}</strong>
        <span style="font-size: 0.9em; color: #ccc; font-style: italic; margin-left: 10px;">${item.rarity || 'Common'}</span>
      </div>
      <div style="font-size: 0.9em; color: #ccc; margin-bottom: 5px;">
        ${item.type || 'Misc'} ${item.attunement && item.attunement !== 'No' ? `(Requires Attunement)` : ''}
      </div>
      <div style="font-size: 0.9em;">
        <strong>Cost:</strong> ${item.cost || 'N/A'}<br/>
        <strong>Weight:</strong> ${item.weight || 'N/A'}
      </div>
      
      ${item.weaponStats ? `
        <div style="font-size: 0.9em; margin-top: 5px;">
          <strong>Damage:</strong> ${item.weaponStats.damage || ''} ${item.weaponStats.damageType || ''}<br/>
          <strong>Properties:</strong> ${item.weaponStats.properties || 'None'}
        </div>
      ` : ''}

      ${item.armorStats ? `
        <div style="font-size: 0.9em; margin-top: 5px;">
          <strong>AC:</strong> ${item.armorStats.armorClass || 'N/A'}<br/>
          <strong>Type:</strong> ${item.armorStats.armorType || 'N/A'}<br/>
          ${item.armorStats.strengthRequirement > 0 ? `<strong>Strength:</strong> ${item.armorStats.strengthRequirement}<br/>` : ''}
          ${item.armorStats.stealthDisadvantage ? `<em>Stealth Disadvantage</em>` : ''}
        </div>
      ` : ''}

      <hr style="margin: 8px 0; border-color: #555;" />
      <div style="font-size: 0.9em; max-height: 150px; overflow-y: auto; white-space: pre-wrap;">${item.description || 'No description.'}</div>
    </div>
  `;
};