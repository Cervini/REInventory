// D&D 5th Edition rules for carrying capacity based on size.
const sizeMultipliers = {
    'Tiny': 0.5,
    'Small': 1,
    'Medium': 1,
    'Large': 2,
    'Huge': 4,
    'Gargantuan': 8,
};

/**
 * Calculates a character's carrying capacity based on D&D 5e rules.
 * @param {number} strength - The character's Strength score.
 * @param {string} size - The character's size category (e.g., 'Medium').
 * @returns {number} The calculated maximum carrying capacity in pounds (lbs).
 */
export function calculateCarryingCapacity(strength, size) {
    const strengthScore = Number(strength) || 0;
    const multiplier = sizeMultipliers[size] || 1; // Default to 1 if size is invalid
    
    return strengthScore * 15 * multiplier;
}