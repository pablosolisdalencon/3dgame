import React from 'react';
import { useIntersectionEvents } from '@react-three-rapier'; // RapierRigidBody for type hint // Removed Collider type import // Removed RapierRigidBody
import { useEnemyStore } from '../stores/enemyStore.js';
import { usePlayerStore } from '../stores/playerStore.js'; // Now used for player taking damage
import { useInventoryStore } from '../stores/inventoryStore.js'; // Import inventory store
import { useLootStore } from '../stores/lootStore.js'; // Import loot store

const PLAYER_ATTACK_DAMAGE = 25;
const ENEMY_ATTACK_DAMAGE = 15; // TODO: Centralize this constant

const CollisionHandler = () => {
  const { dealDamageToEnemy } = useEnemyStore();
  const { takeDamage: dealDamageToPlayer } = usePlayerStore(); // Get takeDamage for player
  const addItemToInventory = useInventoryStore((state) => state.addItem);
  const removeLootFromScene = useLootStore((state) => state.removeLoot);

  useIntersectionEvents( (event) => {
    const collider1 = event.collider1;
    const collider2 = event.collider2;
    const rb1 = collider1.parent();
    const rb2 = collider2.parent();

    // Helper to determine which is player, enemy, hitbox, loot etc.
    const getEntityPair = (
        typeA,
        typeB,
        c1, r1,
        c2, r2
    ) => {
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
      const enemyId = enemyRb.userData?.id;
      if (enemyId) {
        // console.log(`Player attack hitbox collided with enemy ${enemyId}`);
        const { enemyDied } = dealDamageToEnemy(enemyId, PLAYER_ATTACK_DAMAGE);
        // console.log(`Dealt ${PLAYER_ATTACK_DAMAGE} damage to enemy ${enemyId}. Enemy died: ${enemyDied}`);
        // Note: A single attack swing might register multiple intersections if the hitbox remains
        // active and overlapping. PlayerController's attack duration and cooldown manage this.
        // For true single-hit-per-swing, more state needed on PlayerController (e.g. list of hit IDs per swing).
      }
    }

    // --- Enemy Attack Hitbox vs Player ---
    // Player's RigidBody userData.type is "player"
    // Enemy's attack hitbox (CuboidCollider) userData.type is "enemyAttackHitbox"
    const [enemyAttackCollider, enemyAttackRb, playerBodyCollider, playerBodyRbDetails] = getEntityPair("enemyAttackHitbox", "player", collider1, rb1, collider2, rb2);

    if (enemyAttackCollider && playerBodyCollider && event.intersecting) {
      // enemyAttackRb is the RigidBody of the enemy owning the hitbox.
      // enemyAttackCollider.userData.id should be the enemy's ID if set up in AiController.
      const attackingEnemyId = enemyAttackCollider.userData?.id; // or enemyAttackRb.userData.id
      console.log(`Enemy attack hitbox (owner: ${attackingEnemyId || 'unknown'}) collided with player.`);
      dealDamageToPlayer(ENEMY_ATTACK_DAMAGE);
      // Note: The AiController's isEnemyHitboxActive state and ENEMY_HITBOX_ACTIVE_DURATION
      // should prevent this from firing continuously for a single attack.
      // For additional safety (e.g. player invulnerability frames), that logic would go here or in playerStore.
    }


    // --- Player vs Loot ---
    // Player's main body collider (not the attack hitbox) vs loot sensor
    // Loot items have userData.type === "loot" on their *RigidBody*.
    let playerForLootRb = null;
    let lootItemRb = null;
    let lootItemData = null;

    // Check rb1 is player and rb2 is loot
    if (rb1?.userData?.type === "player" && rb2?.userData?.type === "loot") {
        playerForLootRb = rb1;
        lootItemRb = rb2;
        lootItemData = rb2.userData;
    }
    // Check rb2 is player and rb1 is loot
    else if (rb2?.userData?.type === "player" && rb1?.userData?.type === "loot") {
        playerForLootRb = rb2;
        lootItemRb = rb1;
        lootItemData = rb1.userData;
    }

    if (playerForLootRb && lootItemRb && lootItemData && event.intersecting) {
        const { lootId, itemId, itemName } = lootItemData;
        if (lootId && itemId && itemName) {
            console.log(`Player picked up loot: ${itemName} (Instance: ${lootId}, Type: ${itemId})`);
            addItemToInventory({ id: itemId, name: itemName /* icon can be added here if defined */ });
            removeLootFromScene(lootId); // Remove from active loot in the 3D world
        }
    }
  });

  return null; // This component does not render anything
};

export default CollisionHandler;
