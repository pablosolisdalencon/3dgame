import React from 'react';
// import { AmbientLight, DirectionalLight } from 'three'; // Not needed if using R3F primitive elements

const CharacterPlaceholder: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
};

const Scene: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.8} /> {/* Adjusted intensity for better visibility */}
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow /> {/* Adjusted intensity */}
      <CharacterPlaceholder />
    </>
  );
};

export default Scene;
