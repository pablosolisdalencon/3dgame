import React from 'react';
import { useIntersectionEvents } from '@react-three/rapier';
import type { Collider } from '@react-three/rapier';
import { useEnemyStore } from '../stores/enemyStore';
import { usePlayerStore } from '../stores/playerStore'; // For potential future use (e.g. enemy attacks player)

const PLAYER_ATTACK_DAMAGE = 25;

const CollisionHandler: React.FC = () => {
  const { dealDamageToEnemy } = useEnemyStore();
  // const { takeDamage: dealDamageToPlayer } = usePlayerStore(); // Example if enemies could attack

  useIntersectionEvents( (event) => {
    const collider1 = event.collider1;
    const collider2 = event.collider2;
    const rigidBody1 = collider1.parent();
    const rigidBody2 = collider2.parent();

    // Check if one is playerAttackHitbox and the other is an enemy
    let playerHitboxCollider: Collider | null = null;
    let enemyCollider: Collider | null = null;
    let enemyRigidBody: ReturnType<Collider['parent']> | null = null;

    if (collider1.userData?.type === "playerAttackHitbox" && rigidBody2?.userData?.type === "enemy") {
      playerHitboxCollider = collider1;
      enemyCollider = collider2;
      enemyRigidBody = rigidBody2;
    } else if (collider2.userData?.type === "playerAttackHitbox" && rigidBody1?.userData?.type === "enemy") {
      playerHitboxCollider = collider2;
      enemyCollider = collider1;
      enemyRigidBody = rigidBody1;
    }

    if (playerHitboxCollider && enemyCollider && enemyRigidBody && event.intersecting) {
      // Intersection started
      const enemyId = enemyRigidBody.userData?.id as string;
      if (enemyId) {
        console.log(`Player attack hitbox collided with enemy ${enemyId}`);
        const { enemyDied } = dealDamageToEnemy(enemyId, PLAYER_ATTACK_DAMAGE);
        console.log(`Dealt ${PLAYER_ATTACK_DAMAGE} damage to enemy ${enemyId}. Enemy died: ${enemyDied}`);
        // Here, we could also trigger the flash effect on the enemy.
        // This will be handled more directly in AiController via store subscription in the next step.

        // Optionally, apply a small knockback to the enemy
        // This requires access to the enemy's RigidBody instance.
        // For now, we'll skip direct knockback from here to keep it simpler.
        // Knockback could also be a reaction within the AiController itself when its health changes.

        // Important: Prevent dealing damage multiple times for the same attack swing.
        // The player's attack hitbox is active for a duration. If the enemy remains intersecting,
        // this event might fire multiple times.
        // One way is to have the player's attack "remember" who it hit this swing.
        // Or, the hitbox could be disabled immediately after first contact for this swing.
        // For now, the damage store logic in enemyStore (won't damage DYING/DEAD) helps,
        // but an enemy could still take multiple hits from one swing if alive.
        // A simple solution: the hitbox collider itself could be disabled more rapidly,
        // or the player's `setAttacking(false)` could be called sooner.
        // The current setup in PlayerController (disabling hitbox after ATTACK_DURATION) is a start.
        // A more robust system might involve a list of entities hit during the current attack action.
      }
    }
    // else if (playerHitboxCollider && enemyCollider && !event.intersecting) {
    //   // Intersection ended
    //   // console.log("Player attack hitbox stopped colliding with enemy");
    // }

    // --- Example: Enemy attacks player ---
    // if (collider1.userData?.type === "enemyAttackHitbox" && rigidBody2?.userData?.type === "player") {
    //   if (event.intersecting) {
    //     console.log("Enemy attack hitbox collided with player");
    //     // dealDamageToPlayer(ENEMY_ATTACK_DAMAGE);
    //   }
    // } else if (collider2.userData?.type === "enemyAttackHitbox" && rigidBody1?.userData?.type === "player") {
    //   if (event.intersecting) {
    //     console.log("Enemy attack hitbox collided with player");
    //     // dealDamageToPlayer(ENEMY_ATTACK_DAMAGE);
    //   }
    // }
  });

  return null; // This component does not render anything
};

export default CollisionHandler;
