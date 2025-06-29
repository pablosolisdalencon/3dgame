import create from 'zustand';
import * as THREE from 'three';

export interface PlayerState {
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  setPosition: (position: THREE.Vector3) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  setAttacking: (isAttacking: boolean) => void;
  // Could also add states like isDead, etc.
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  position: new THREE.Vector3(0, 1, 0), // Initial position slightly above ground
  health: 100,
  maxHealth: 100,
  isAttacking: false,

  setPosition: (newPosition) => set({ position: newPosition }),

  takeDamage: (amount) => {
    set((state) => ({ health: Math.max(0, state.health - amount) }));
    // Potentially trigger other effects like game over if health <= 0
  },

  heal: (amount) => {
    set((state) => ({ health: Math.min(state.maxHealth, state.health + amount) }));
  },

  setAttacking: (isAttacking) => set({ isAttacking }),
}));

// Note: Renamed from usePlayerPositionStore to usePlayerStore for broader scope
export default usePlayerStore;
