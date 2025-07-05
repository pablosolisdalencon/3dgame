import create from 'zustand';
import * as THREE from 'three';

// export interface PlayerState {
//   position: THREE.Vector3;
//   health: number;
//   maxHealth: number;
//   isAttacking: boolean;
//   isDead: boolean; // Added isDead state
//   setPosition: (position: THREE.Vector3) => void;
//   takeDamage: (amount: number) => void;
//   heal: (amount: number) => void;
//   setAttacking: (isAttacking: boolean) => void;
//   resetPlayerState: () => void; // For restarting, etc.
// }

export const usePlayerStore = create((set, get) => ({
  position: new THREE.Vector3(0, 1, 0), // Initial position slightly above ground
  health: 100,
  maxHealth: 100,
  isAttacking: false,
  isDead: false,

  setPosition: (newPosition) => set({ position: newPosition }),

  takeDamage: (amount) => {
    set((state) => {
      if (state.isDead) return {}; // No damage if already dead
      const newHealth = Math.max(0, state.health - amount);
      if (newHealth <= 0) {
        console.log("Player has died.");
        return { health: 0, isDead: true };
      }
      return { health: newHealth };
    });
  },

  heal: (amount) => {
    set((state) => {
      if (state.isDead) return { health: state.health }; // No healing if dead, return current state
      return { health: Math.min(state.maxHealth, state.health + amount) };
    });
  },

  setAttacking: (isAttacking) => set({ isAttacking }),

  resetPlayerState: () => {
    set({
      health: 100, // Or use initialMaxHealth if defined
      maxHealth: 100,
      isDead: false,
      position: new THREE.Vector3(0, 1, 0), // Reset position
      // isAttacking should probably be false by default
    });
  }

  // setAttacking: (isAttacking) => set({ isAttacking }), // Removed duplicate
}));

// Note: Renamed from usePlayerPositionStore to usePlayerStore for broader scope
export default usePlayerStore;
