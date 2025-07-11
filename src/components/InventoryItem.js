/**
 * Represents a single item in the inventory.
 * No changes here.
 */
export function InventoryItem({ item }) {
    // This style is applied to the outer "wrapper" div.
    // It only handles the grid positioning and size.
    const wrapperStyle = {
        gridColumn: `${item.x + 1} / span ${item.w}`,
        gridRow: `${item.y + 1} / span ${item.h}`,
    };

  const style = {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  };

  return (
    // Positioning
    <div style={wrapperStyle}>
      {/* Styling*/}
      <div
        className={`${item.color} shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)] rounded-lg w-full h-full flex items-center justify-center text-white font-bold p-1 text-center text-xs sm:text-sm`}
      >
        {item.name}
      </div>
    </div>
  );
}