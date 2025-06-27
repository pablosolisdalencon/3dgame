import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBodyProps } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three-rapier';
import { usePlayerStore } from '../stores/playerStore';
import { useEnemyStore } from '../stores/enemyStore'; // EnemyStatus is implicitly typed via store
import { useLootStore } from '../stores/lootStore'; // Import loot store
import * as THREE from 'three';

interface AiControllerProps {
  id: string;
  initialPosition: [number, number, number];
}

const ENEMY_MOVE_SPEED = 2.5;
const DETECTION_RADIUS = 10; // Player detection range
const ATTACK_RADIUS = 1.5;   // Range within which enemy will attempt to attack
const ATTACK_DURATION_ENEMY = 500; // ms, how long enemy "attacks" (placeholder)
const ATTACK_COOLDOWN_ENEMY = 2000; // ms, cooldown between enemy attacks
const DEATH_DURATION = 1000; // ms, how long enemy stays in "DYING" state

const AiController: React.FC<AiControllerProps> = ({ id, initialPosition }) => {
  const enemyRbRef = useRef<RapierRigidBody>(null);
  const enemyObjectRef = useRef<THREE.Group>(null); // For visual orientation

  const playerPosition = usePlayerStore((state) => state.position);
  const {
    enemies,
    updateEnemyPosition,
    updateEnemyStatus,
  } = useEnemyStore(state => ({ // Select only necessary parts to avoid re-renders
    enemies: state.enemies,
    updateEnemyPosition: state.updateEnemyPosition,
    updateEnemyStatus: state.updateEnemyStatus,
  }));

  // Memoize enemyData to prevent unnecessary recalculations if other parts of enemies store change
  const enemyData = useMemo(() => enemies[id], [enemies, id]);
  const prevHealthRef = useRef(enemyData?.health);

  // Local state for attack timing
  const [canAttackPlayer, setCanAttackPlayer] = useState(true);
  const attackTimeoutAIRef = useRef<NodeJS.Timeout | null>(null);
  const attackCooldownAIRef = useRef<NodeJS.Timeout | null>(null);
  const deathTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visual feedback for damage
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalColor = useRef(new THREE.Color(0xff0000)); // Default red

  useEffect(() => {
    // Set original color from mesh if possible, once available
    // Use materialRef for more direct access if mesh structure is simple
    if (materialRef.current) {
        originalColor.current.copy(materialRef.current.color);
    } else if (enemyObjectRef.current) { // Fallback
        const mesh = enemyObjectRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material && (mesh.material as THREE.MeshStandardMaterial).color) {
            originalColor.current.copy((mesh.material as THREE.MeshStandardMaterial).color);
        }
    }
    return () => { // Cleanup timeouts
      if (attackTimeoutAIRef.current) clearTimeout(attackTimeoutAIRef.current);
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
    updateEnemyPosition(id, new THREE.Vector3(currentPositionVec.x, currentPositionVec.y, currentPositionVec.z));

    const distanceToPlayer = playerPosition.distanceTo(new THREE.Vector3(currentPositionVec.x, currentPositionVec.y, currentPositionVec.z));
    const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, currentPosition).normalize();

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
          console.log(`Enemy ${id} attacks player! (Placeholder)`);
          // Here, actual attack logic (e.g., dealing damage to player) would go.
          // For now, it's a placeholder.
          setCanAttackPlayer(false);

          if (attackTimeoutAIRef.current) clearTimeout(attackTimeoutAIRef.current);
          attackTimeoutAIRef.current = setTimeout(() => {
            // Attack animation/action finished
          }, ATTACK_DURATION_ENEMY);

          if (attackCooldownAIRef.current) clearTimeout(attackCooldownAIRef.current);
          attackCooldownAIRef.current = setTimeout(() => {
            setCanAttackPlayer(true);
            // Decide next state after attack cooldown
            // Check current status from store again, as it might have changed (e.g. died)
            const freshEnemyData = useEnemyStore.getState().enemies[id]; // Get latest data
            if (freshEnemyData?.status === "ATTACKING") { // Check if still in attacking state
                 const currentDistance = playerPosition.distanceTo(new THREE.Vector3(rb.translation().x, rb.translation().y, rb.translation().z));
                if (currentDistance < ATTACK_RADIUS) {
                    // Stays in ATTACKING, will re-evaluate on next canAttackPlayer cycle
                } else if (currentDistance < DETECTION_RADIUS) {
                    updateEnemyStatus(id, "CHASING");
                } else {
                    updateEnemyStatus(id, "IDLE");
                }
            }
          }, ATTACK_COOLDOWN_ENEMY);
        }
        // If player moves out of attack range during the "ATTACKING" state (but before cooldown ends)
        // it will transition based on the cooldown timeout's logic.
        break;

      // DYING and DEAD are handled by their duration/visibility logic above.
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
          const dropPosition = enemyRbRef.current?.translation();
          if (dropPosition) {
            // Add a slight vertical offset for the drop if desired
            const spawnPos = new THREE.Vector3(dropPosition.x, dropPosition.y + 0.5, dropPosition.z);
            spawnLoot(loot.itemId, loot.itemName, spawnPos);
            // console.log(`Enemy ${id} dropped ${loot.itemName}`); // Logged by lootStore now
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
      </group>
    </RigidBody>
  );
};

export default AiController;
