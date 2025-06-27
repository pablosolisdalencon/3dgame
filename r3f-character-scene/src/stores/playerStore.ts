import create from 'zustand';
import * as THREE from 'three';

interface PlayerState {
  position: THREE.Vector3;
  // Potentially add rotation/quaternion if needed for camera later
  // quaternion: THREE.Quaternion;
  setPosition: (position: THREE.Vector3) => void;
  // setQuaternion: (quaternion: THREE.Quaternion) => void;
}

export const usePlayerPositionStore = create<PlayerState>((set) => ({
  position: new THREE.Vector3(0, 0, 0), // Initial position
  // quaternion: new THREE.Quaternion(), // Initial rotation
  setPosition: (newPosition) => set({ position: newPosition }),
  // setQuaternion: (newQuaternion) => set({ quaternion: newQuaternion }),
}));

export default usePlayerPositionStore;
