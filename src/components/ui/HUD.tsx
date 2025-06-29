import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import './HUD.css'; // We'll create this CSS file next

const HUD: React.FC = () => {
  const { health, maxHealth } = usePlayerStore((state) => ({
    health: state.health,
    maxHealth: state.maxHealth,
  }));

  const healthPercentage = maxHealth > 0 ? (health / maxHealth) * 100 : 0;

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
