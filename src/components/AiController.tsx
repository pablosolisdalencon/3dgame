import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, CuboidCollider, RapierRigidBodyProps, Collider } from '@react-three-rapier'; // Added CuboidCollider, Collider
import type { RapierRigidBody } from '@react-three-rapier';
import { usePlayerStore } from '../stores/playerStore';
import { useEnemyStore } from '../stores/enemyStore'; // EnemyStatus is implicitly typed via store
import { useLootStore } from '../stores/lootStore'; // Import loot store
// No longer need 'Item' from inventoryStore for POTENTIAL_LOOT type, using ItemDefinition now
import { ITEM_DEFINITIONS, ItemDefinition } from '../data/itemDefinitions'; // Import new definitions
import * as THREE from 'three';

interface AiControllerProps {
  id: string;
  initialPosition: [number, number, number];
}

const ENEMY_MOVE_SPEED = 2.5;
const DETECTION_RADIUS = 10; // Player detection range
const ATTACK_RADIUS = 1.5;   // Range within which enemy will attempt to attack
const ATTACK_DURATION_ENEMY = 500; // ms, how long enemy "attacks" (total animation/state)
const ENEMY_HITBOX_ACTIVE_DURATION = 200; // ms, how long the actual hitbox is active during attack
const ATTACK_COOLDOWN_ENEMY = 2000; // ms, cooldown between enemy attacks
const DEATH_DURATION = 1000; // ms, how long enemy stays in "DYING" state
const FLASH_DURATION = 150; // ms, how long the enemy flashes white when hit
const ENEMY_ATTACK_DAMAGE = 15; // Damage dealt by enemy attack

// Define potential loot drops: uses itemId from ItemDefinition and dropChance (0-1)
interface PotentialLootEntry {
  itemId: ItemDefinition['id']; // Use the type from ItemDefinition
  dropChance: number;
}
const POTENTIAL_LOOT: PotentialLootEntry[] = [
  { itemId: ITEM_DEFINITIONS.health_potion_small.id, dropChance: 0.5 },
  { itemId: ITEM_DEFINITIONS.gold_coins_small.id, dropChance: 0.7 },
  // Example: { itemId: ITEM_DEFINITIONS.rusty_key.id, dropChance: 0.1 } // If enemies could drop keys
];

const AiController: React.FC<AiControllerProps> = ({ id, initialPosition }) => {
  const enemyRbRef = useRef<RapierRigidBody>(null);
  const enemyObjectRef = useRef<THREE.Group>(null); // For visual orientation
  const enemyHitboxRef = useRef<Collider>(null); // Ref for the enemy attack hitbox

  const playerPosition = usePlayerStore((state) => state.position);
  const playerPosition = usePlayerStore((state) => state.position);
  const { enemies, updateEnemyPosition, updateEnemyStatus } = useEnemyStore(state => ({
    enemies: state.enemies,
    updateEnemyPosition: state.updateEnemyPosition,
    updateEnemyStatus: state.updateEnemyStatus,
  }));
  const spawnLoot = useLootStore((state) => state.spawnLoot); // Get spawnLoot from lootStore

  // Memoize enemyData to prevent unnecessary recalculations if other parts of enemies store change
  const enemyData = useMemo(() => enemies[id], [enemies, id]);
  const prevHealthRef = useRef(enemyData?.health);

  // Local state for attack timing
  const [canAttackPlayer, setCanAttackPlayer] = useState(true);
  const [isEnemyHitboxActive, setIsEnemyHitboxActive] = useState(false);
  const attackActionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For hitbox duration
  const attackCooldownAIRef = useRef<NodeJS.Timeout | null>(null);
  const deathTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visual feedback for damage
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null); // Ref for the enemy's material
  const originalColor = useRef(new THREE.Color(0xff0000)); // Default red, will be updated

  useEffect(() => {
    // Set original color from mesh if possible, once available
    if (materialRef.current) {
        originalColor.current.copy(materialRef.current.color);
    }
    // Initial setup of originalColor if materialRef is already populated
    // This might be too early if the mesh/material isn't rendered yet.
    // A better approach might be to set it once the mesh is available.
    // For now, this assumes the materialRef will be populated before first flash.

    return () => { // Cleanup timeouts
      if (attackActionTimeoutRef.current) clearTimeout(attackActionTimeoutRef.current); // Corrected ref name
      if (attackCooldownAIRef.current) clearTimeout(attackCooldownAIRef.current);
      if (deathTimeoutRef.current) clearTimeout(deathTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Effect to trigger flash when health decreases
  useEffect(() => {
    if (enemyData) {
      if (prevHealthRef.current !== undefined && enemyData.health < prevHealthRef.current) {
        setIsFlashing(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => {
          setIsFlashing(false);
        }, FLASH_DURATION);
      }
      prevHealthRef.current = enemyData.health;
    }
  }, [enemyData?.health]); // Depend on enemyData.health

  // Visibility and physics body type based on status
  const [isVisible, setIsVisible] = useState(true);
  const [rbType, setRbType] = useState<RapierRigidBodyProps['type']>('dynamic');

  useEffect(() => {
    if (!enemyData) {
      setIsVisible(false); // Should not happen if correctly added/removed from store
      return;
    }
    if (enemyData.status === "DEAD" || enemyData.status === "INACTIVE") {
      setIsVisible(false);
      setRbType("fixed"); // Make it static and asleep if dead, to prevent further interaction
      enemyRbRef.current?.sleep();
    } else {
      setIsVisible(true);
      // Only set to dynamic if not DYING, DYING will set its own type
      if (enemyData.status !== "DYING") {
         setRbType("dynamic");
      }
    }
  }, [enemyData?.status]);


  useFrame((state, delta) => {
    if (!enemyRbRef.current || !enemyData || !playerPosition || !isVisible || enemyData.status === "DYING") {
      return;
    }

    const rb = enemyRbRef.current;
    const currentPositionVec = rb.translation();
    const currentPositionTHREE = new THREE.Vector3(currentPositionVec.x, currentPositionVec.y, currentPositionVec.z);
    updateEnemyPosition(id, currentPositionTHREE);

    const distanceToPlayer = playerPosition.distanceTo(currentPositionTHREE);
    const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, currentPositionTHREE).normalize();

    // State Machine Logic
    switch (enemyData.status) {
      case "IDLE":
        rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true); // Stop horizontal movement
        if (distanceToPlayer < DETECTION_RADIUS) {
          updateEnemyStatus(id, "CHASING");
        }
        break;

      case "CHASING":
        if (distanceToPlayer < ATTACK_RADIUS) {
          updateEnemyStatus(id, "ATTACKING");
        } else if (distanceToPlayer > DETECTION_RADIUS * 1.5) { // Hysteresis for de-aggro
          updateEnemyStatus(id, "IDLE");
        } else {
          // Move towards player
          const targetVelocity = directionToPlayer.multiplyScalar(ENEMY_MOVE_SPEED);
          rb.setLinvel({ x: targetVelocity.x, y: rb.linvel().y, z: targetVelocity.z }, true);
          // Orient towards player
          if (enemyObjectRef.current && directionToPlayer.lengthSq() > 0) {
            const angle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
            enemyObjectRef.current.rotation.y = angle;
          }
        }
        break;

      case "ATTACKING":
        rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true); // Stop while attacking

        if (canAttackPlayer) {
          setCanAttackPlayer(false); // Prevent immediate re-attack
          setIsEnemyHitboxActive(true); // Activate hitbox
          console.log(`Enemy ${id} starts attack, hitbox active.`);

          // Deactivate hitbox after ENEMY_HITBOX_ACTIVE_DURATION
          if (attackActionTimeoutRef.current) clearTimeout(attackActionTimeoutRef.current);
          attackActionTimeoutRef.current = setTimeout(() => {
            setIsEnemyHitboxActive(false);
            console.log(`Enemy ${id} attack action finished, hitbox deactivated.`);
            // The overall "ATTACKING" state might last longer (ATTACK_DURATION_ENEMY) for animation purposes
            // but the hitbox is only active for a short period.
          }, ENEMY_HITBOX_ACTIVE_DURATION);

          // Cooldown before enemy can attempt another attack sequence
          if (attackCooldownAIRef.current) clearTimeout(attackCooldownAIRef.current);
          attackCooldownAIRef.current = setTimeout(() => {
            setCanAttackPlayer(true);
            console.log(`Enemy ${id} can attack again.`);

            // After cooldown, decide next state based on player proximity
            // Ensure enemy RB is still valid before trying to get its translation
            const freshEnemyData = useEnemyStore.getState().enemies[id];
            if (!freshEnemyData || freshEnemyData.status === "DYING" || freshEnemyData.status === "DEAD" || !enemyRbRef.current) {
                return; // Enemy might have died or been removed during cooldown
            }
            const currentRbPosition = enemyRbRef.current.translation();
            const currentDistanceToPlayer = playerPosition.distanceTo(
              new THREE.Vector3(currentRbPosition.x, currentRbPosition.y, currentRbPosition.z)
            );

            if (freshEnemyData.status === "ATTACKING") { // Still in attack mode conceptually
                if (currentDistanceToPlayer < ATTACK_RADIUS) {
                    // Player still in range, can attempt another attack cycle immediately if canAttackPlayer is true
                } else if (currentDistanceToPlayer < DETECTION_RADIUS) {
                    updateEnemyStatus(id, "CHASING");
                } else {
                    updateEnemyStatus(id, "IDLE");
                }
            }
          }, ATTACK_COOLDOWN_ENEMY);
        }
        // If player moves out of attack range during the ATTACKING state (but before cooldown ends),
        // the logic within the cooldown timeout will handle transition to CHASING or IDLE.
        // If enemy is still in ATTACKING state but canAttackPlayer is false, it means it's in its attack animation/action or cooldown.
        break;

      // DYING and DEAD are handled by their duration/visibility logic and useEffects.
    }
  });

  // Handle automatic transition from DYING to DEAD and loot drop
  useEffect(() => {
    if (!enemyData) return;

    if (enemyData.status === "DYING") {
      console.log(`Enemy ${id} is DYING. Preparing to drop loot and transition to DEAD.`);
      setIsVisible(true); // Ensure visible during dying "animation"
      setRbType("kinematicPosition"); // Prevent further physics interaction but can be "animated"

      // Attempt to drop loot
      POTENTIAL_LOOT.forEach(loot => {
        if (Math.random() < loot.dropChance) {
          const itemDef = ITEM_DEFINITIONS[loot.itemId];
          if (!itemDef) {
            console.warn(`AiController: Item definition not found for itemId: ${loot.itemId}`);
            continue;
          }
          const dropPosition = enemyRbRef.current?.translation();
          if (dropPosition) {
            // Add a slight vertical offset for the drop if desired
            const spawnPos = new THREE.Vector3(dropPosition.x, dropPosition.y + 0.5, dropPosition.z);
            spawnLoot(itemDef.id, itemDef.name, spawnPos); // Pass actual name from definition
            // console.log(`Enemy ${id} dropped ${itemDef.name}`); // Logged by lootStore now
          }
        }
      });

      if (deathTimeoutRef.current) clearTimeout(deathTimeoutRef.current);
      deathTimeoutRef.current = setTimeout(() => {
        updateEnemyStatus(id, "DEAD");
        // console.log(`Enemy ${id} is DEAD.`); // Logged by lootStore now
      }, DEATH_DURATION);
    }

  }, [enemyData?.status, id, updateEnemyStatus, spawnLoot, enemyData]); // Added enemyData to deps for loot drop position


  if (!enemyData || !isVisible) { // If no data or not visible (e.g. DEAD and processed)
    return null;
  }

  return (
    <RigidBody
      ref={enemyRbRef}
      colliders={false}
      type={rbType} // Dynamically set based on status
      position={initialPosition}
      enabledRotations={[false, true, false]}
      friction={0.5}
      restitution={0.2}
      name={`enemy-${id}`}
      mass={1}
      userData={{ type: "enemy", id: id }} // Identify as enemy and its ID
      // Visibility of the RigidBody itself isn't a direct prop in Rapier components,
      // it's controlled by whether the component renders or not, and the visibility of its children.
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <group ref={enemyObjectRef} visible={isVisible}> {/* Control visibility of the THREE.Group */}
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.5, 0.5, 16, 8]} />
          <meshStandardMaterial
            ref={materialRef} // Assign ref to material
            color={isFlashing ? 0xffffff : originalColor.current}
            emissive={isFlashing ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)}
            emissiveIntensity={isFlashing ? 0.5 : 0}
          />
        </mesh>
        {/* Enemy Attack Hitbox */}
        <CuboidCollider
          ref={enemyHitboxRef}
          args={[0.4, 0.5, 0.7]} // Half-extents: width, height, depth (depth is forward)
          position={[0, 0.5, -0.8]} // Centered on Y, in front on Z
          sensor={true}
          activeEvents={isEnemyHitboxActive ? 0b01 : 0b00} // CollisionEvents.CONTACT_EVENTS if active
          userData={{ type: "enemyAttackHitbox", id: id }} // Identify for collision handler
        />
        {/* Optional: Visualizer for enemy hitbox (for debugging) */}
        {isEnemyHitboxActive && (
            <mesh position={[0, 0.5, -0.8]}>
                <boxGeometry args={[0.8, 1, 1.4]} />
                <meshStandardMaterial color="purple" wireframe />
            </mesh>
        )}
      </group>
    </RigidBody>
  );
};

export default AiController;
