import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, CuboidCollider } from '@react-three-rapier'; // Added CuboidCollider
import type { RapierRigidBody, Collider } from '@react-three-rapier';
import * as THREE from 'three'; // Import THREE
import { usePlayerControls, useControlsStore } from '../hooks/usePlayerControls'; // Import useControlsStore for resetKey
import { usePlayerStore } from '../stores/playerStore'; // Corrected import name
// import * as THREE from 'three'; // Already imported via @react-three/fiber or rapier types indirectly, or explicitly needed

const PLAYER_MOVE_SPEED = 5; // units per second
const PLAYER_JUMP_FORCE = 7; // force units
const ATTACK_DURATION = 300; // ms, how long the hitbox is active
const ATTACK_COOLDOWN = 500; // ms, time before player can attack again

const PlayerController: React.FC = () => {
  const playerRigidBodyRef = useRef<RapierRigidBody>(null);
  const playerObjectRef = useRef<THREE.Group>(null); // For visual orientation
  const hitboxRef = useRef<Collider>(null); // Ref for the hitbox collider
  const { camera } = useThree(); // Get the camera for potential camera-relative controls

  // Get controls state from the hook that returns the state object
  const controls = usePlayerControls();
  const { forward, backward, left, right, jump, attack } = controls;

  // Get setters from the stores
  const { setPosition: setPlayerStorePosition, setAttacking: setPlayerStoreAttacking, isAttacking: playerIsAttacking } = usePlayerStore();
  const resetControlKey = useControlsStore((state) => state.resetKey);


  // State for managing hitbox activation and attack cooldown
  const [isHitboxActive, setIsHitboxActive] = useState(false);
  const attackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attackCooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canAttack, setCanAttack] = useState(true);

  // Temporary vectors for calculations to avoid allocations in loop
  const _cameraForward = new THREE.Vector3();
  const _cameraRight = new THREE.Vector3();
  const _movement = new THREE.Vector3();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
      if (attackCooldownTimeoutRef.current) clearTimeout(attackCooldownTimeoutRef.current);
    };
  }, []);

  useFrame((state, delta) => {
    if (!playerRigidBodyRef.current || !playerObjectRef.current) return;

    const rb = playerRigidBodyRef.current;
    const playerObject = playerObjectRef.current;
    const currentPositionVec = rb.translation();

    // Update the Zustand store with the player's current position
    setPlayerStorePosition(new THREE.Vector3(currentPositionVec.x, currentPositionVec.y, currentPositionVec.z));

    // --- Movement Calculation (Camera Relative) ---
    camera.getWorldDirection(_cameraForward);
    _cameraForward.y = 0; // Project onto XZ plane
    _cameraForward.normalize();
    _cameraRight.crossVectors(camera.up, _cameraForward).negate().normalize(); // camera.up is (0,1,0)

    _movement.set(0, 0, 0); // Reset movement vector
    if (forward) _movement.add(_cameraForward);
    if (backward) _movement.sub(_cameraForward);
    if (left) _movement.add(_cameraRight);
    if (right) _movement.sub(_cameraRight);
    _movement.normalize();

    const currentVelocity = rb.linvel();
    const targetVelocity = new THREE.Vector3(
      _movement.x * PLAYER_MOVE_SPEED,
      currentVelocity.y,
      _movement.z * PLAYER_MOVE_SPEED
    );
    rb.setLinvel(targetVelocity, true);

    // --- Jump ---
    if (jump) {
        const origin = currentPositionVec; // Use already fetched position
        const ray = new state.scene.userData.rapierWorld.Ray(
            { x: origin.x, y: origin.y, z: origin.z },
            { x: 0, y: -1, z: 0 }
        );
        // Cast ray slightly shorter than half player height + small buffer to avoid self-collision if origin is inside collider
        const hit = state.scene.userData.rapierWorld.castRay(ray, 0.55, true, undefined, undefined, rb.collider(0));
        if (hit) {
            rb.applyImpulse({ x: 0, y: PLAYER_JUMP_FORCE, z: 0 }, true);
        }
        resetControlKey('jump'); // Reset jump after processing
    }

    // --- Attack ---
    if (attack && canAttack && !playerIsAttacking) {
      console.log("Player attacking!");
      setPlayerStoreAttacking(true);
      setIsHitboxActive(true);
      setCanAttack(false); // Start cooldown

      // (Placeholder for attack animation)

      // Deactivate hitbox after ATTACK_DURATION
      if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
      attackTimeoutRef.current = setTimeout(() => {
        setIsHitboxActive(false);
        setPlayerStoreAttacking(false);
        resetControlKey('attack'); // Reset attack control state
        console.log("Player attack finished, hitbox deactivated.");
      }, ATTACK_DURATION);

      // Allow attacking again after ATTACK_COOLDOWN
      if (attackCooldownTimeoutRef.current) clearTimeout(attackCooldownTimeoutRef.current);
      attackCooldownTimeoutRef.current = setTimeout(() => {
        setCanAttack(true);
        console.log("Player can attack again.");
      }, ATTACK_COOLDOWN);
    }


    // --- Player Visual Orientation ---
    if (_movement.lengthSq() > 0) {
        const angle = Math.atan2(_movement.x, _movement.z);
        playerObject.rotation.y = angle;
    }
  });

  return (
    <RigidBody
      ref={playerRigidBodyRef}
      colliders={false} // Main collider is CapsuleCollider below
      type="dynamic"
      position={[0, 1, 0]}
      enabledRotations={[false, true, false]} // Only allow Y-axis rotation
      friction={0.5}
      restitution={0.2}
      name="player" // For debugging or specific interactions
      mass={1}
      userData={{ type: "player" }} // For identifying in collision events
    >
      {/* Main player body collider */}
      <CapsuleCollider args={[0.5, 0.5]} /> {/* Half-height, radius */}

      {/* Player visual representation */}
      <group ref={playerObjectRef}>
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 0.5, 16, 8]} />
          <meshStandardMaterial color="royalblue" />
        </mesh>

        {/* Attack Hitbox: A sensor CuboidCollider in front of the player */}
        {/* It's part of the player's group so it moves and rotates with the player */}
        {/* Positioned 0.75 units in front, 0.5 units half-width/depth, 0.5 units half-height */}
        <CuboidCollider
          ref={hitboxRef}
          args={[0.5, 0.5, 0.5]} // Half-extents: width, height, depth
          position={[0, 0.5, -0.75]} // x, y (centered on player's capsule height), z (in front)
          sensor={true} // Make it a sensor so it detects but doesn't cause physical collision response
          activeEvents={isHitboxActive ? 0b01 : 0b00} // CollisionEvents.CONTACT_EVENTS : 0 - Only active when isHitboxActive
          userData={{ type: "playerAttackHitbox" }} // For identifying in collision events
        />
         {/* Optional: Visualizer for hitbox (for debugging) */}
        {isHitboxActive && (
            <mesh position={[0, 0.5, -0.75]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="red" wireframe />
            </mesh>
        )}
      </group>
    </RigidBody>
  );
};

export default PlayerController;
