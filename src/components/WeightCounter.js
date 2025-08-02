import React from 'react';

// Conversion factor from lbs to kg
const LBS_TO_KG = 0.453592;

export default function WeightCounter({ items, maxWeight, unit }) {
  // 1. Calculate the total weight of all items in lbs.
  const totalWeightLbs = items.reduce((total, item) => {
    // Extract the numerical part of the weight string (e.g., "5 lb." -> 5)
    const weightValue = parseFloat(item.weight);
    if (!isNaN(weightValue)) {
      // Multiply by quantity for stackable items
      return total + (weightValue * (item.quantity || 1));
    }
    return total;
  }, 0);

  // 2. Determine which values to display based on the selected unit.
  const displayWeight = unit === 'kg' ? (totalWeightLbs * LBS_TO_KG) : totalWeightLbs;
  const displayMaxWeight = unit === 'kg' ? (maxWeight * LBS_TO_KG) : maxWeight;
  
  // 3. Check if the character is over-encumbered.
  const isOverEncumbered = displayWeight > displayMaxWeight;

  return (
    <div className="text-sm font-bold">
      <span className={isOverEncumbered ? 'text-destructive' : 'text-text-muted'}>
        {/* Format numbers to one decimal place */}
        {displayWeight.toFixed(1)}
      </span>
      <span className="text-text-muted/70"> / {displayMaxWeight.toFixed(1)} {unit}</span>
    </div>
  );
}