import React from 'react';
import { Physics, useRapier, RigidBody, CuboidCollider } from '@react-three/rapier';
import PlayerController from './components/PlayerController';
import CameraRig from './components/CameraRig'; // Import CameraRig
import { useThree } from '@react-three/fiber';

// This component will ensure the rapier world is available in scene.userData
const RapierWorldSetup: React.FC = () => {
  const { scene } = useThree();
  const rapier = useRapier();
  if (rapier.world) { // Ensure world is initialized
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
