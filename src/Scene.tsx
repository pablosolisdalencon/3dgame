import React, { useEffect } from 'react';
import { Physics, useRapier, RigidBody, CuboidCollider } from '@react-three/rapier'; // Removed ActiveEvents, not used directly here
import PlayerController from './components/PlayerController';
import CameraRig from './components/CameraRig';
import CollisionHandler from './components/CollisionHandler'; // Already imported, ensure it's used
import AiController from './components/AiController';
import { useEnemyStore } from './stores/enemyStore';
import { useLootStore } from './stores/lootStore'; // Import loot store
import LootDrop from './components/LootDrop'; // Import LootDrop component
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// Define initial enemy configurations
const initialEnemiesConfig = [
  { id: "enemy-1", position: new THREE.Vector3(5, 1, 0), health: 100, maxHealth: 100 },
  { id: "enemy-2", position: new THREE.Vector3(-5, 1, 2), health: 120, maxHealth: 120 },
  { id: "enemy-3", position: new THREE.Vector3(0, 1, -6), health: 80, maxHealth: 80 },
];

// This component will ensure the rapier world is available in scene.userData
const RapierWorldSetup: React.FC = () => {
  const { scene } = useThree();
  const rapier = useRapier();
  if (rapier.world) {
    scene.userData.rapierWorld = rapier.world;
  }
  return null;
};

const Ground: React.FC = () => {
  return (
    <RigidBody type="fixed" colliders="cuboid" friction={1.0} name="ground">
      {/* The CuboidCollider dimensions are half-extents. So a 20x1x20 box. */}
      <CuboidCollider args={[10, 0.5, 10]} position={[0, -0.5, 0]} />
      {/* Optional: Add a mesh to visualize the ground */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="grey" />
      </mesh>
    </RigidBody>
  );
};

const Walls: React.FC = () => {
    // Dimensions for the walls
    const wallThickness = 0.5;
    const wallHeight = 3;
    const arenaSize = 10; // Corresponds to CuboidCollider half-extents for ground

    return (
        <>
            {/* Wall 1: +X side */}
            <RigidBody type="fixed" colliders="cuboid">
                <CuboidCollider args={[wallThickness, wallHeight / 2, arenaSize]} position={[arenaSize + wallThickness, wallHeight / 2 - 0.5, 0]} />
                 <mesh position={[arenaSize + wallThickness, wallHeight / 2 - 0.5, 0]} castShadow>
                    <boxGeometry args={[wallThickness * 2, wallHeight, arenaSize * 2]} />
                    <meshStandardMaterial color="darkgrey" />
                </mesh>
            </RigidBody>
            {/* Wall 2: -X side */}
            <RigidBody type="fixed" colliders="cuboid">
                <CuboidCollider args={[wallThickness, wallHeight / 2, arenaSize]} position={[-arenaSize - wallThickness, wallHeight / 2 - 0.5, 0]} />
                <mesh position={[-arenaSize - wallThickness, wallHeight / 2 - 0.5, 0]} castShadow>
                    <boxGeometry args={[wallThickness * 2, wallHeight, arenaSize * 2]} />
                    <meshStandardMaterial color="darkgrey" />
                </mesh>
            </RigidBody>
            {/* Wall 3: +Z side */}
            <RigidBody type="fixed" colliders="cuboid">
                <CuboidCollider args={[arenaSize, wallHeight / 2, wallThickness]} position={[0, wallHeight / 2 - 0.5, arenaSize + wallThickness]} />
                 <mesh position={[0, wallHeight / 2 - 0.5, arenaSize + wallThickness]} castShadow>
                    <boxGeometry args={[arenaSize * 2, wallHeight, wallThickness * 2]} />
                    <meshStandardMaterial color="darkgrey" />
                </mesh>
            </RigidBody>
            {/* Wall 4: -Z side */}
            <RigidBody type="fixed" colliders="cuboid">
                <CuboidCollider args={[arenaSize, wallHeight / 2, wallThickness]} position={[0, wallHeight / 2 - 0.5, -arenaSize - wallThickness]} />
                <mesh position={[0, wallHeight / 2 - 0.5, -arenaSize - wallThickness]} castShadow>
                    <boxGeometry args={[arenaSize * 2, wallHeight, wallThickness * 2]} />
                    <meshStandardMaterial color="darkgrey" />
                </mesh>
            </RigidBody>
        </>
    )
}

const Scene: React.FC = () => {
  const addEnemyToStore = useEnemyStore((state) => state.addEnemy);
  const enemies = useEnemyStore((state) => state.enemies); // Get all enemies for rendering AiControllers
  const activeLoot = useLootStore((state) => state.activeLoot); // Get active loot for rendering LootDrops
  const removeLoot = useLootStore((state) => state.removeLoot); // To pass to LootDrop if needed, though CollisionHandler handles pickup

  // Add initial enemies to the store on component mount
  useEffect(() => {
    initialEnemiesConfig.forEach(config => {
      // Check if enemy already exists to prevent duplicates on HMR or re-renders
      if (!enemies[config.id]) {
        addEnemyToStore({
          id: config.id,
          position: config.position, // This is initial spawn, AiController will manage its own RB position
          health: config.health,
          maxHealth: config.maxHealth,
          initialStatus: "IDLE",
        });
      }
    });
  }, [addEnemyToStore]); // `enemies` removed from deps to only run once for initial setup

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Physics gravity={[0, -9.81, 0]}>
        <RapierWorldSetup />
        <PlayerController />
        <CameraRig /> {/* Ensure CameraRig is here */}
        <Ground />
        <Walls />
        <CollisionHandler /> {/* Add CollisionHandler to the scene */}

        {/* Render AiController for each enemy in the store */}
        {Object.values(enemies).map(enemy => {
          // Only render if enemy is not DEAD or INACTIVE (AiController handles its own visibility for DYING)
          if (enemy.status !== "DEAD" && enemy.status !== "INACTIVE") {
            return (
              <AiController
                key={enemy.id}
                id={enemy.id}
                initialPosition={[enemy.position.x, enemy.position.y, enemy.position.z]}
                // Other props like health, status are read from store by AiController itself
              />
            );
          }
          return null;
        })}

        {/* Render LootDrop for each active loot item */}
        {Object.values(activeLoot).map(loot => (
          <LootDrop
            key={loot.lootInstanceId}
            lootId={loot.lootInstanceId}
            itemId={loot.itemId}
            itemName={loot.itemName}
            position={[loot.position.x, loot.position.y, loot.position.z]}
            // onPickup is handled by CollisionHandler via sensor intersections
          />
        ))}
      </Physics>
    </>
  );
};

export default Scene;
