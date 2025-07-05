// export interface ItemDefinition {
//   id: string;
//   name: string;
//   description?: string;
//   icon?: string; // Path to icon, or identifier for an icon component
//   type: 'consumable' | 'currency' | 'equipment' | 'keyItem'; // Type of item
//   stackable: boolean;
//   maxStack?: number;
//   effects?: Record<string, any>; // e.g., { "heal": 25, "boost": "attack" }
// }

export const ITEM_DEFINITIONS = {
  "health_potion_small": {
    id: "health_potion_small",
    name: "Small Health Potion",
    description: "Restores a small amount of health.",
    type: 'consumable',
    stackable: true,
    maxStack: 10,
    effects: {
      heal: 20,
    }
  },
  "gold_coins_small": {
    id: "gold_coins_small",
    name: "Small Pile of Gold",
    description: "A few shiny coins.",
    type: 'currency',
    stackable: true,
    maxStack: 999, // Or however high you want gold to stack
  },
  "rusty_key": {
    id: "rusty_key",
    name: "Rusty Key",
    description: "Opens a rusty lock.",
    type: 'keyItem',
    stackable: false,
  }
  // ... more items can be added here
};

// Helper function to get an item definition
export const getItemDefinition = (itemId) => {
  return ITEM_DEFINITIONS[itemId];
};
