import create from 'zustand';
import * as THREE from 'three';

// export type EnemyStatus = "IDLE" | "CHASING" | "ATTACKING" | "DYING" | "DEAD" | "INACTIVE";

// export interface Enemy {
//   id: string;
//   position: THREE.Vector3;
//   health: number;
//   maxHealth: number;
//   status: EnemyStatus;
//   // targetPosition?: THREE.Vector3; // Optional: for movement logic if not directly chasing player
//   // lastAttackedPlayer?: boolean; // Optional: for AI cooldowns etc.
// }

// interface EnemyState {
//   enemies: Record<string, Enemy>; // Store enemies in an object for easy ID-based access

//   addEnemy: (enemyData: Omit<Enemy, 'status'> & { initialStatus?: EnemyStatus }) => void;
//   removeEnemy: (id: string) => void;
//   updateEnemyPosition: (id: string, position: THREE.Vector3) => void;
//   updateEnemyStatus: (id: string, status: EnemyStatus) => void;
//   dealDamageToEnemy: (id: string, damage: number) => { enemyDied: boolean };
//   // resetEnemies: () => void; // Optional: for game resets
// }

export const useEnemyStore = create((set, get) => ({
  enemies: {},

  addEnemy: (enemyData) => {
    set((state) => {
      const newEnemies = { ...state.enemies };
      if (newEnemies[enemyData.id]) {
        console.warn(`Enemy with ID ${enemyData.id} already exists. Overwriting.`);
      }
      newEnemies[enemyData.id] = {
        ...enemyData,
        status: enemyData.initialStatus || "IDLE",
      };
      return { enemies: newEnemies };
    });
  },

  removeEnemy: (id) => {
    set((state) => {
      const newEnemies = { ...state.enemies };
      delete newEnemies[id];
      return { enemies: newEnemies };
    });
  },

  updateEnemyPosition: (id, position) => {
    set((state) => {
      if (!state.enemies[id]) return state; // No change if enemy not found
      const updatedEnemy = { ...state.enemies[id], position };
      return {
        enemies: { ...state.enemies, [id]: updatedEnemy },
      };
    });
  },

  updateEnemyStatus: (id, status) => {
    set((state) => {
      if (!state.enemies[id] || state.enemies[id].status === "DEAD") return state; // No change if enemy not found or already dead
      // Prevent status change from DYING unless to DEAD
      if (state.enemies[id].status === "DYING" && status !== "DEAD") return state;

      const updatedEnemy = { ...state.enemies[id], status };
      return {
        enemies: { ...state.enemies, [id]: updatedEnemy },
      };
    });
  },

  dealDamageToEnemy: (id, damage) => {
    let enemyDied = false;
    set((state) => {
      const enemy = state.enemies[id];
      if (!enemy || enemy.status === "DYING" || enemy.status === "DEAD") {
        return state; // No change if enemy not found, dying or already dead
      }

      const newHealth = Math.max(0, enemy.health - damage);
      let newStatus = enemy.status;

      if (newHealth <= 0) {
        newStatus = "DYING";
        enemyDied = true;
      }

      const updatedEnemy = { ...enemy, health: newHealth, status: newStatus };
      return {
        enemies: { ...state.enemies, [id]: updatedEnemy },
      };
    });
    return { enemyDied };
  },

  // Example for resetting (if needed later)
  // resetEnemies: () => set({ enemies: {} }),
}));

export default useEnemyStore;
