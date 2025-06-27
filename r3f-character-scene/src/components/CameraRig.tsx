import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerPositionStore } from '../stores/playerStore';
import * as THREE from 'three';

const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const playerWorldPosition = usePlayerPositionStore((state) => state.position);

  // Camera target and current position for lerping
  const currentCameraPositionRef = useRef(new THREE.Vector3());
  const currentLookAtRef = useRef(new THREE.Vector3());

  // Desired camera offset from player (isometric / third-person style)
  const cameraOffset = new THREE.Vector3(0, 8, 10); // x, y (height), z (distance)
  // For a more isometric view, X might be non-zero, e.g. (5, 5, 5) or (7,7,7)

  useFrame((state, delta) => {
    if (!playerWorldPosition) return;

    const targetPosition = new THREE.Vector3().copy(playerWorldPosition);

    // Calculate desired camera position
    // Simple offset for now, could be more complex (e.g., follow player rotation)
    const desiredCameraPosition = new THREE.Vector3().addVectors(targetPosition, cameraOffset);

    // Smoothly interpolate camera position (lerp)
    currentCameraPositionRef.current.lerp(desiredCameraPosition, 0.05); // Adjust 0.05 for different smoothing speeds

    // Smoothly interpolate lookAt target (player's position, possibly with a height offset)
    const lookAtTarget = new THREE.Vector3().copy(targetPosition).add(new THREE.Vector3(0, 1, 0)); // Look slightly above player's base
    currentLookAtRef.current.lerp(lookAtTarget, 0.05);

    camera.position.copy(currentCameraPositionRef.current);
    camera.lookAt(currentLookAtRef.current);
    camera.updateProjectionMatrix(); // Important if camera settings change, though not strictly needed for pos/lookAt updates
  });

  // Initialize camera position once
  React.useEffect(() => {
    const initialTargetPosition = new THREE.Vector3().copy(playerWorldPosition);
    const initialCameraPosition = new THREE.Vector3().addVectors(initialTargetPosition, cameraOffset);
    currentCameraPositionRef.current.copy(initialCameraPosition);
    currentLookAtRef.current.copy(initialTargetPosition).add(new THREE.Vector3(0,1,0));
    camera.position.copy(initialCameraPosition);
    camera.lookAt(currentLookAtRef.current);
  }, []); // Empty dependency array ensures this runs once on mount


  return null; // This component only manipulates the camera
};

export default CameraRig;
