import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, SphereCollider } from '@react-three-rapier';
import type { RapierRigidBody } from '@react-three-rapier';
import * as THREE from 'three';

export interface LootDropProps {
  lootId: string; // Unique instance ID for this specific drop
  itemId: string; // Type of item (e.g., "health_potion")
  itemName: string; // Display name (e.g., "Health Potion")
  position: [number, number, number];
  onPickup?: (lootId: string) => void; // Callback when picked up (will be used by store)
}

const LootDrop: React.FC<LootDropProps> = ({ lootId, itemId, itemName, position, onPickup }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Simple bobbing animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = Math.sin(time * 2) * 0.25 + 0.25; // Bob up and down by 0.25 units
      meshRef.current.rotation.y = time * 0.5; // Slowly rotate
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="fixed" // Or "kinematicPosition" if it needs to be moved programmatically after spawn
      position={position}
      colliders={false} // We define the sensor collider explicitly
      name={`loot-${lootId}`}
      userData={{
        type: "loot",
        lootId: lootId, // Unique instance ID of this dropped item
        itemId: itemId,   // The ID of the item type (e.g., "health_potion")
        itemName: itemName // The display name of the item
      }}
    >
      {/* Sensor collider for pickup detection */}
      <SphereCollider
        args={[0.75]} // Radius of the sensor sphere
        sensor={true}
        // activeEvents={0b01} // ActiveEvents.CONTACT_EVENTS - always active for loot sensors
                           // Or could be managed by parent if many loot items
      />
      {/* Visual representation of the loot */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} /> {/* Simple cube for now */}
        <meshStandardMaterial color="gold" emissive="yellow" emissiveIntensity={0.2} />
      </mesh>
    </RigidBody>
  );
};

export default LootDrop;
