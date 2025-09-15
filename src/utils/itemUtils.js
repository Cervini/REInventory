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
 * @param {boolean} [isViewerDM=false] - Whether the person viewing the tooltip is the DM.
 * @returns {string} The HTML string for the tooltip.
 */
export const generateItemTooltip = (item, isViewerDM = false) => {
  if (!item) return '';

  const rarityColor = {
    Common: 'text-text-muted',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-400',
    'Very Rare': 'text-purple-400',
    Legendary: 'text-orange-400',
    Artifact: 'text-red-500',
  };

  let tooltipHtml = `<div class="max-w-xs text-sm text-left text-text-base">`;
  tooltipHtml += `<h4 class="font-bold text-base">${item.name}</h4>`;
  tooltipHtml += `<p class="${rarityColor[item.rarity] || 'text-text-muted'}">${item.rarity || 'Common'}</p>`;
  
  if (item.attunement === 'Yes') {
    tooltipHtml += `<p class="text-xs text-text-muted italic">Requires Attunement</p>`;
  }

  tooltipHtml += `<hr class="border-surface/50 my-2">`;

  // Item Type and Weight/Cost
  let details = [];
  if (item.type) details.push(item.type);
  if (item.weight) details.push(`${item.weight}`);
  if (item.cost) details.push(`${item.cost}`);
  if (details.length > 0) {
    tooltipHtml += `<p class="text-xs text-text-muted">${details.join(' | ')}</p>`;
  }

  // Weapon Stats
  if (item.type === 'Weapon' && item.weaponStats) {
    const { damage, damageType, properties } = item.weaponStats;
    if (damage || damageType || properties) {
      tooltipHtml += `<div class="text-text-base/90 mt-2 space-y-1">`;
      if (damage) tooltipHtml += `<p><strong>Damage:</strong> ${damage} ${damageType || ''}</p>`;
      if (properties) tooltipHtml += `<p><strong>Properties:</strong> ${properties || 'None'}</p>`;
      tooltipHtml += `</div>`;
    }
  }

  // Armor Stats
  if (item.type === 'Armor' && item.armorStats) {
    const { armorClass, armorType, strengthRequirement, stealthDisadvantage } = item.armorStats;
    if (armorClass) {
      tooltipHtml += `<p class="text-text-base/90 mt-2"><strong>Armor Class:</strong> ${armorClass}</p>`;
    }
    let armorDetails = [];
    if (armorType) armorDetails.push(armorType);
    if (strengthRequirement > 0) armorDetails.push(`Str ${strengthRequirement}`);
    if (stealthDisadvantage) armorDetails.push('Stealth Disadvantage');
    if (armorDetails.length > 0) {
      tooltipHtml += `<p class="text-xs text-text-muted">${armorDetails.join(', ')}</p>`;
    }
  }

  // Description
  if (item.description) {
    tooltipHtml += `<p class="text-text-base/90 mt-2 italic" style="white-space: pre-wrap;">${item.description}</p>`;
  }

  // Magic Properties
  if (item.magicProperties && (isViewerDM || item.magicPropertiesVisible)) {
    tooltipHtml += `<hr class="border-accent/20 my-2">`;
    tooltipHtml += `<div class="text-accent/90">`;
    tooltipHtml += `<p class="font-bold">Magic Properties</p>`;
    tooltipHtml += `<p class="text-sm" style="white-space: pre-wrap;">${item.magicProperties}</p>`;
    if (isViewerDM && !item.magicPropertiesVisible) {
      tooltipHtml += `<p class="text-xs italic text-accent/70">(Hidden from player)</p>`;
    }
    tooltipHtml += `</div>`;
  }

  tooltipHtml += `</div>`;
  return tooltipHtml;
};