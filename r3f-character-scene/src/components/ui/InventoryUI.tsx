import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import type { Item } from '../../stores/inventoryStore'; // Import Item type
import './InventoryUI.css';

const InventoryUI: React.FC = () => {
  const items = useInventoryStore((state) => state.items);
  const [isOpen, setIsOpen] = useState(false); // State to toggle inventory visibility

  const toggleInventory = () => setIsOpen(!isOpen);

  // Optional: Add keyboard listener to toggle inventory (e.g., 'I' key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'i') {
        toggleInventory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty array ensures this effect runs only once

  if (!isOpen) {
    return (
        <button className="inventory-toggle-button" onClick={toggleInventory}>
            Inventory (I)
        </button>
    );
  }

  const inventoryItems = Object.values(items);

  return (
    <div className="inventory-overlay">
      <div className="inventory-container">
        <h2>Inventory</h2>
        <button className="inventory-close-button" onClick={toggleInventory}>Close (I)</button>
        {inventoryItems.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          <ul className="inventory-list">
            {inventoryItems.map((item: Item) => (
              <li key={item.id} className="inventory-item">
                {/* Optional: <img src={item.icon || 'default-icon.png'} alt={item.name} /> */}
                <span className="item-name">{item.name}</span>
                <span className="item-quantity">x {item.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InventoryUI;
