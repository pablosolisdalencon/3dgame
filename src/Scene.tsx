import React, { useEffect } from 'react';
import { Physics, useRapier, RigidBody, CuboidCollider, ActiveEvents } from '@react-three/rapier';
import PlayerController from './components/PlayerController';
import CameraRig from './components/CameraRig';
import CollisionHandler from './components/CollisionHandler';
import AiController from './components/AiController'; // Import AiController
import { useEnemyStore } from './stores/enemyStore'; // Import enemy store
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// This component will ensure the rapier world is available in scene.userData
const RapierWorldSetup: React.FC = () => {
  const { scene } = useThree();
  const rapier = useRapier();
  if (rapier.world) {
    scene.userData.rapierWorld = rapier.world;
  }
  return null;
};

// Define initial enemy configurations
const initialEnemiesConfig = [
  { id: "enemy-1", position: new THREE.Vector3(5, 1, 0), health: 100, maxHealth: 100 },
  { id: "enemy-2", position: new THREE.Vector3(-5, 1, 2), health: 120, maxHealth: 120 },
  { id: "enemy-3", position: new THREE.Vector3(0, 1, -6), health: 80, maxHealth: 80 },
];

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
  const addEnemy = useEnemyStore((state) => state.addEnemy);
  const enemies = useEnemyStore((state) => state.enemies);

  // Add initial enemies to the store on component mount
  useEffect(() => {
    initialEnemiesConfig.forEach(config => {
      // Check if enemy already exists to prevent duplicates on HMR or re-renders
      if (!enemies[config.id]) {
        addEnemy({
          id: config.id,
          position: config.position,
          health: config.health,
          maxHealth: config.maxHealth,
          initialStatus: "IDLE",
        });
      }
    });
  }, [addEnemy]); // `enemies` removed from deps to only run once for initial setup

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
        <Ground />
        <Walls />
      </Physics>
    </>
  );
};

export default Scene;
