import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three-rapier';
import type { RapierRigidBody } from '@react-three-rapier';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { usePlayerPositionStore } from '../stores/playerStore'; // Import the store
import * as THREE from 'three';

const PLAYER_MOVE_SPEED = 5; // units per second
const PLAYER_JUMP_FORCE = 7; // force units

const PlayerController: React.FC = () => {
  const playerRigidBodyRef = useRef<RapierRigidBody>(null);
  const playerObjectRef = useRef<THREE.Group>(null); // For visual orientation
  const { camera } = useThree(); // Get the camera for potential camera-relative controls

  const { forward, backward, left, right, jump } = usePlayerControls();
  const setPlayerPosition = usePlayerPositionStore((state) => state.setPosition);

  // Temporary vector for calculations to avoid allocations in loop
  const _worldDirection = new THREE.Vector3();
  const _cameraForward = new THREE.Vector3();
  const _cameraRight = new THREE.Vector3();
  const _movement = new THREE.Vector3();


  useFrame((state, delta) => {
    if (!playerRigidBodyRef.current || !playerObjectRef.current) return;

    const rb = playerRigidBodyRef.current;
    const playerObject = playerObjectRef.current;
    const currentPosition = rb.translation();

    // Update the Zustand store with the player's current position
    setPlayerPosition(new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z));

    // --- Camera-Relative Movement Calculation ---
    // Get camera's forward and right vectors (on the XZ plane)
    camera.getWorldDirection(_cameraForward);
    _cameraForward.y = 0; // Project onto XZ plane
    _cameraForward.normalize();
    _cameraRight.crossVectors(camera.up, _cameraForward).negate().normalize(); // camera.up is (0,1,0)

    // Calculate movement direction based on camera orientation
    _movement.set(0, 0, 0);
    if (forward) _movement.add(_cameraForward);
    if (backward) _movement.sub(_cameraForward);
    if (left) _movement.add(_cameraRight); // Add camera's right vector (which is left relative to camera's forward)
    if (right) _movement.sub(_cameraRight); // Subtract camera's right vector

    _movement.normalize(); // Ensure consistent speed

    // --- Apply Movement ---
    const moveDirection = new THREE.Vector3();
    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (left) moveDirection.x -= 1;
    if (right) moveDirection.x += 1;

    moveDirection.normalize(); // Ensure consistent speed in all directions

    // Apply movement relative to player's current orientation (if needed, for now world-based)
    // For camera-relative movement, this vector would be rotated by camera's Y angle.
    // For now, let's assume world axes for simplicity.

    const currentVelocity = rb.linvel();
    const targetVelocity = new THREE.Vector3(
      moveDirection.x * PLAYER_MOVE_SPEED,
      currentVelocity.y, // Preserve Y velocity for gravity/jumping
      moveDirection.z * PLAYER_MOVE_SPEED
    );

    rb.setLinvel(targetVelocity, true);

    // Handle Jump
    // A proper jump usually involves checking if the player is grounded.
    // For now, a simple jump implementation.
    if (jump) {
        // Check if grounded (simplified, can be improved with raycasting)
        const origin = rb.translation();
        const ray = new state.scene.userData.rapierWorld.Ray(
            { x: origin.x, y: origin.y, z: origin.z },
            { x: 0, y: -1, z: 0 }
        );
        const hit = state.scene.userData.rapierWorld.castRay(ray, 0.6, true); // Max TOI of 0.6 (half height + bit more)

        if (hit) { // If hit something below, consider grounded
            rb.applyImpulse({ x: 0, y: PLAYER_JUMP_FORCE, z: 0 }, true);
        }
    }

    // Update player visual orientation if moving
    if (moveDirection.lengthSq() > 0) {
        // Rotate player mesh to face movement direction
        // This is a simple rotation, might need smoothing or different logic for third-person view
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        playerObject.rotation.y = angle;
    }

    // Update camera target or player position for camera follow later
    // For now, just ensure the RigidBody has the playerObject as its child for visual representation
  });

  return (
    <RigidBody
      ref={playerRigidBodyRef}
      colliders={false}
      type="dynamic"
      position={[0, 1, 0]}
      enabledRotations={[false, true, false]}
      friction={0.5}
      restitution={0.2}
      name="player"
      mass={1} // Explicitly set mass
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <group ref={playerObjectRef}>
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 0.5, 16, 8]} />
          <meshStandardMaterial color="royalblue" />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default PlayerController;
