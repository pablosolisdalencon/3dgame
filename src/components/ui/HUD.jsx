import React from 'react';
import { usePlayerStore } from '../../stores/playerStore.js';
import './HUD.css'; // We'll create this CSS file next

const HUD = () => {
  const { health, maxHealth, isDead } = usePlayerStore((state) => ({
    health: state.health,
    maxHealth: state.maxHealth,
    isDead: state.isDead,
  }));

  const healthPercentage = maxHealth > 0 ? (health / maxHealth) * 100 : 0;

  if (isDead) {
    return (
      <div className="hud-container game-over-overlay">
        <h1>GAME OVER</h1>
        {/* Optionally, add a button to reset or go to main menu later */}
        {/* <button onClick={() => usePlayerStore.getState().resetPlayerState()}>Retry</button> */}
      </div>
    );
  }

  return (
    <div className="hud-container">
      <div className="health-bar-container">
        <div
          className="health-bar-fill"
          style={{ width: `${healthPercentage}%` }}
        />
        <div className="health-bar-text">
          {health} / {maxHealth} HP
        </div>
      </div>
      {/* Other HUD elements can be added here later, e.g., score, ammo, minimap */}
    </div>
  );
};

export default HUD;
