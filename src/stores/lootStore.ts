import create from 'zustand';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid'; // For generating unique loot instance IDs

export interface ActiveLootItem {
  lootInstanceId: string; // Unique ID for this specific instance in the world
  itemId: string;         // Type of item (e.g., "health_potion")
  itemName: string;       // Display name (e.g., "Health Potion")
  position: THREE.Vector3;
  // Potentially add quantity if a single drop can represent multiple items
}

interface LootStoreState {
  activeLoot: Record<string, ActiveLootItem>; // Loot items currently in the 3D scene

  // Spawns a new loot item by adding it to the activeLoot record
  spawnLoot: (itemId: string, itemName: string, position: THREE.Vector3) => string;

  // Removes a loot item from the scene, e.g., when picked up
  removeLoot: (lootInstanceId: string) => void;

  clearAllLoot: () => void;
}

export const useLootStore = create<LootStoreState>((set, get) => ({
  activeLoot: {},

  spawnLoot: (itemId, itemName, position) => {
    const lootInstanceId = uuidv4(); // Generate a unique ID for this drop instance
    const newLootItem: ActiveLootItem = {
      lootInstanceId,
      itemId,
      itemName,
      position: position.clone(), // Clone to avoid external modification issues
    };
    set((state) => ({
      activeLoot: {
        ...state.activeLoot,
        [lootInstanceId]: newLootItem,
      },
    }));
    console.log(`LootStore: Spawning loot "${itemName}" (Instance ID: ${lootInstanceId}) at`, position);
    return lootInstanceId;
  },

  removeLoot: (lootInstanceId) => {
    set((state) => {
      const newActiveLoot = { ...state.activeLoot };
      if (newActiveLoot[lootInstanceId]) {
        console.log(`LootStore: Removing loot instance ID ${lootInstanceId} (${newActiveLoot[lootInstanceId].itemName})`);
        delete newActiveLoot[lootInstanceId];
      } else {
        console.warn(`LootStore: Attempted to remove non-existent loot instance ID ${lootInstanceId}`);
      }
      return { activeLoot: newActiveLoot };
    });
  },

  clearAllLoot: () => {
    set({ activeLoot: {} });
    console.log("LootStore: All active loot cleared.");
  }
}));

export default useLootStore;
