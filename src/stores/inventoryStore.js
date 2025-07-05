import create from 'zustand';
import { getItemDefinition } from '../data/itemDefinitions.js'; // Import item definitions
import { usePlayerStore } from './playerStore.js'; // To apply effects like healing

// Represents an item instance in the inventory
// export interface InventoryItem {
//   id: string;       // ItemDefinition ID
//   quantity: number;
// }

// interface InventoryState {
//   items: Record<string, InventoryItem>; // Store items by their ID

//   addItem: (itemId: string, amount?: number) => void;
//   removeItem: (itemId: string, amount?: number) => void;
//   useItem: (itemId: string) => boolean; // Returns true if item was used successfully
//   getItem: (itemId: string) => InventoryItem | undefined;
//   getItemDefinition: (itemId: string) => ItemDefinition | undefined; // Helper to get full definition
//   clearInventory: () => void;
// }

export const useInventoryStore = create((set, get) => ({
  items: {},

  addItem: (itemId, amount = 1) => {
    const definition = getItemDefinition(itemId);
    if (!definition) {
      console.warn(`InventoryStore: Attempted to add item with unknown ID: ${itemId}`);
      return;
    }

    set((state) => {
      const newItems = { ...state.items };
      const existingItem = newItems[itemId];

      if (existingItem) {
        const newQuantity = existingItem.quantity + amount;
        newItems[itemId] = {
          ...existingItem,
          quantity: definition.stackable ? Math.min(newQuantity, definition.maxStack || Infinity) : 1,
        };
      } else {
        newItems[itemId] = {
          id: itemId,
          quantity: definition.stackable ? Math.min(amount, definition.maxStack || Infinity) : 1,
        };
      }
      console.log(`Inventory: Added ${amount} of ${definition.name} (ID: ${itemId}). New quantity: ${newItems[itemId].quantity}`);
      return { items: newItems };
    });
  },

  removeItem: (itemId, amount = 1) => {
    set((state) => {
      const newItems = { ...state.items };
      const existingItem = newItems[itemId];
      const definition = getItemDefinition(itemId); // Get definition for logging name

      if (existingItem) {
        const newQuantity = existingItem.quantity - amount;
        if (newQuantity <= 0) {
          delete newItems[itemId];
          if (definition) console.log(`Inventory: Removed all ${definition.name} (ID: ${itemId}).`);
          else console.log(`Inventory: Removed all of item ID: ${itemId}.`);
        } else {
          newItems[itemId] = { ...existingItem, quantity: newQuantity };
          if (definition) console.log(`Inventory: Removed ${amount} of ${definition.name} (ID: ${itemId}). New quantity: ${newQuantity}`);
          else console.log(`Inventory: Removed ${amount} of item ID: ${itemId}. New quantity: ${newQuantity}`);
        }
      } else {
        console.warn(`InventoryStore: Attempted to remove item ID ${itemId} but it was not found.`);
      }
      return { items: newItems };
    });
  },

  useItem: (itemId) => {
    const inventoryItem = get().items[itemId];
    const definition = getItemDefinition(itemId);
    const playerHeal = usePlayerStore.getState().heal; // Get heal function from playerStore

    if (!inventoryItem || inventoryItem.quantity <= 0) {
      console.warn(`InventoryStore: Attempted to use item ID ${itemId}, but it's not in inventory or quantity is zero.`);
      return false;
    }
    if (!definition) {
      console.warn(`InventoryStore: No definition found for item ID ${itemId} to use.`);
      return false;
    }

    let usedSuccessfully = false;
    // Apply effects
    if (definition.type === 'consumable' && definition.effects) {
      if (definition.effects.heal) {
        playerHeal(definition.effects.heal);
        console.log(`Inventory: Used ${definition.name}, healed for ${definition.effects.heal}.`);
        usedSuccessfully = true;
      }
      // ... other effects like mana restoration, buffs, etc.
    } else {
      console.log(`Inventory: Item ${definition.name} is not a consumable with defined effects or not handled.`);
    }

    if (usedSuccessfully) {
      // Decrease quantity or remove item
      get().removeItem(itemId, 1);
    }
    return usedSuccessfully;
  },

  getItem: (itemId) => get().items[itemId],

  getItemDefinition: (itemId) => getItemDefinition(itemId),

  clearInventory: () => {
    set({ items: {} });
    console.log("Inventory: Cleared.");
  },
}));

export default useInventoryStore;
