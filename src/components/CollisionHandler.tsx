import React from 'react';
import { useIntersectionEvents, RapierRigidBody } from '@react-three/rapier'; // RapierRigidBody for type hint
import type { Collider } from '@react-three/rapier'; // Only Collider type is needed from here now
import { useEnemyStore } from '../stores/enemyStore';
import { usePlayerStore } from '../stores/playerStore';
import { useInventoryStore } from '../stores/inventoryStore'; // Import inventory store
import { useLootStore } from '../stores/lootStore'; // Import loot store

const PLAYER_ATTACK_DAMAGE = 25;

const CollisionHandler: React.FC = () => {
  const { dealDamageToEnemy } = useEnemyStore();
  // const { takeDamage: dealDamageToPlayer } = usePlayerStore(); // Example if enemies could attack

  useIntersectionEvents( (event) => {
    const collider1 = event.collider1;
    const collider2 = event.collider2;
    const rb1 = collider1.parent();
    const rb2 = collider2.parent();

    // Helper to determine which is player, enemy, hitbox, loot etc.
    const getEntityPair = (
        typeA: string,
        typeB: string,
        c1: Collider, r1: RapierRigidBody | null,
        c2: Collider, r2: RapierRigidBody | null
    ): [Collider | null, RapierRigidBody | null, Collider | null, RapierRigidBody | null] => {
        if (c1.userData?.type === typeA && r2?.userData?.type === typeB) return [c1, r1, c2, r2];
        if (c2.userData?.type === typeA && r1?.userData?.type === typeB) return [c2, r2, c1, r1];
        // For loot, the loot data is on the collider's parent RB, but the type is on the collider itself
        if (c1.userData?.type === typeA && c2.userData?.type === typeB) return [c1, r1, c2, r2];
        if (c2.userData?.type === typeA && c1.userData?.type === typeB) return [c2, r2, c1, r1];
        return [null, null, null, null];
    };

    // --- Player Attack Hitbox vs Enemy ---
    const [playerHitbox, , enemyBodyCollider, enemyRb] = getEntityPair("playerAttackHitbox", "enemy", collider1, rb1, collider2, rb2);

    if (playerHitbox && enemyBodyCollider && enemyRb && event.intersecting) {
      const enemyId = enemyRb.userData?.id as string;
      if (enemyId) {
        // console.log(`Player attack hitbox collided with enemy ${enemyId}`);
        const { enemyDied } = dealDamageToEnemy(enemyId, PLAYER_ATTACK_DAMAGE);
        // console.log(`Dealt ${PLAYER_ATTACK_DAMAGE} damage to enemy ${enemyId}. Enemy died: ${enemyDied}`);
        // Note: A single attack swing might register multiple intersections if the hitbox remains
        // active and overlapping. PlayerController's attack duration and cooldown manage this.
        // For true single-hit-per-swing, more state needed on PlayerController (e.g. list of hit IDs per swing).
      }
    }

    // --- Player vs Loot ---
    // Player's main body collider (not the attack hitbox) vs loot sensor
    // Assuming player's main collider is the first one on the player RB (CapsuleCollider)
    // and loot items have userData.type === "loot" on their *RigidBody*.
    // The LootDrop component sets userData on the RigidBody.
    let playerBodyRb: RapierRigidBody | null = null;
    let lootRb: RapierRigidBody | null = null;
    let lootItemData: any = null;

    if (rb1?.userData?.type === "player" && rb2?.userData?.type === "loot") {
        playerBodyRb = rb1;
        lootRb = rb2;
        lootItemData = rb2.userData;
    } else if (rb2?.userData?.type === "player" && rb1?.userData?.type === "loot") {
        playerBodyRb = rb2;
        lootRb = rb1;
        lootItemData = rb1.userData;
    }

    if (playerBodyRb && lootRb && lootItemData && event.intersecting) {
        const { lootId, itemId, itemName } = lootItemData;
        if (lootId && itemId && itemName) {
            console.log(`Player picked up loot: ${itemName} (Instance: ${lootId}, Type: ${itemId})`);
            addItemToInventory({ id: itemId, name: itemName /* icon can be added here if defined */ });
            removeLootFromScene(lootId); // Remove from active loot in the 3D world
        }
    }

    // --- Potential future: Enemy Attack Hitbox vs Player ---
    // const [enemyAttackHitbox, , playerBodyForEnemyAttack, playerRbForEnemyAttack] = getEntityPair("enemyAttackHitbox", "player", collider1, rb1, collider2, rb2);
    // if (enemyAttackHitbox && playerBodyForEnemyAttack && playerRbForEnemyAttack && event.intersecting) {
    //   console.log("Enemy attack hitbox collided with player");
    //   // dealDamageToPlayer(ENEMY_ATTACK_DAMAGE_VALUE);
    // }
  });

  return null; // This component does not render anything
};

export default CollisionHandler;
