import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore.js';
// import type { InventoryItem } from '../../stores/inventoryStore.js'; // Import InventoryItem type // Removed type import
import { getItemDefinition } from '../../data/itemDefinitions.js'; // Import item definitions helper
import './InventoryUI.css';

const InventoryUI = () => {
  const { items: inventoryItemsMap, useItem, getItemDefinition: getDefFromStore } = useInventoryStore((state) => ({
    items: state.items,
    useItem: state.useItem,
    getItemDefinition: state.getItemDefinition, // Using the one from store for consistency if it's ever different
  }));
  const [isOpen, setIsOpen] = useState(false);

  const toggleInventory = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === 'i') {
        toggleInventory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return (
      <button className="inventory-toggle-button" onClick={toggleInventory}>
        Inventory (I)
      </button>
    );
  }

  const inventoryList = Object.values(inventoryItemsMap);

  return (
    <div className="inventory-overlay">
      <div className="inventory-container">
        <h2>Inventory</h2>
        <button className="inventory-close-button" onClick={toggleInventory}>Close (I)</button>
        {inventoryList.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          <ul className="inventory-list">
            {inventoryList.map((invItem) => {
              const definition = getDefFromStore(invItem.id) || getItemDefinition(invItem.id); // Fallback just in case
              if (!definition) return null; // Should not happen if addItem works correctly

              return (
                <li key={invItem.id} className="inventory-item">
                  {/* Optional: <img src={definition.icon || 'default-icon.png'} alt={definition.name} /> */}
                  <span className="item-name">{definition.name}</span>
                  <span className="item-quantity">x {invItem.quantity}</span>
                  {definition.type === 'consumable' && definition.effects?.heal && (
                    <button
                      className="item-use-button"
                      onClick={() => useItem(invItem.id)}
                      disabled={invItem.quantity <= 0}
                    >
                      Use
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InventoryUI;
