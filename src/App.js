import InventoryGrid from "./components/InventoryGrid";

/**
 * The main App component that holds everything together.
 * No changes here.
 */
export default function App() {
  return (
    <main className="text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-4">D&D Inventory</h1>
        <div className="bg-gray-800 rounded-xl shadow-lg">
          <InventoryGrid />
        </div>
      </div>
    </main>
  );
}
