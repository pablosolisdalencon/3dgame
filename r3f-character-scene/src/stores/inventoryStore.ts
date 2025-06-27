import create from 'zustand';

export interface Item {
  id: string; // Unique identifier for the item type (e.g., "health_potion", "gold_coin")
  name: string; // Display name (e.g., "Health Potion", "Gold Coin")
  icon?: string; // Optional: path to an icon image
  quantity: number;
  // description?: string; // Optional: for item details
  // stackable?: boolean; // Optional: default true, false for unique gear etc.
  // maxStack?: number; // Optional: if stackable
}

interface InventoryState {
  items: Record<string, Item>; // Store items by their ID for easy access

  // Adds a specific quantity of an item. If item exists, increases quantity. If not, adds new item.
  addItem: (itemDetails: Omit<Item, 'quantity'>, amount?: number) => void;

  // Removes a specific quantity of an item. If quantity drops to 0 or less, removes item.
  removeItem: (itemId: string, amount?: number) => void;

  // Gets a specific item by ID
  getItem: (itemId: string) => Item | undefined;

  // Clears the entire inventory
  clearInventory: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: {},

  addItem: (itemDetails, amount = 1) => {
    set((state) => {
      const newItems = { ...state.items };
      const existingItem = newItems[itemDetails.id];

      if (existingItem) {
        newItems[itemDetails.id] = {
          ...existingItem,
          quantity: existingItem.quantity + amount,
        };
      } else {
        newItems[itemDetails.id] = {
          ...itemDetails,
          quantity: amount,
        };
      }
      console.log(`Added ${amount} of ${itemDetails.name} (ID: ${itemDetails.id}). New quantity: ${newItems[itemDetails.id].quantity}`);
      return { items: newItems };
    });
  },

  removeItem: (itemId, amount = 1) => {
    set((state) => {
      const newItems = { ...state.items };
      const existingItem = newItems[itemId];

      if (existingItem) {
        const newQuantity = existingItem.quantity - amount;
        if (newQuantity <= 0) {
          delete newItems[itemId];
          console.log(`Removed all ${existingItem.name} (ID: ${itemId}).`);
        } else {
          newItems[itemId] = {
            ...existingItem,
            quantity: newQuantity,
          };
          console.log(`Removed ${amount} of ${existingItem.name} (ID: ${itemId}). New quantity: ${newQuantity}`);
        }
      } else {
        console.warn(`Attempted to remove item ID ${itemId} but it was not found in inventory.`);
      }
      return { items: newItems };
    });
  },

  getItem: (itemId: string) => {
    return get().items[itemId];
  },

  clearInventory: () => {
    set({ items: {} });
    console.log("Inventory cleared.");
  },
}));

export default useInventoryStore;
