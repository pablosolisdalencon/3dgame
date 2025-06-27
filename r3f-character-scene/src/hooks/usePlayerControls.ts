import { useEffect, useState } from 'react';
import create from 'zustand';

interface ControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  reset: () => void; // Method to reset all controls to false
}

export const useControlsStore = create<ControlsState>()((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  reset: () => set({ forward: false, backward: false, left: false, right: false, jump: false }),
}));

const keyMap: { [key: string]: keyof ControlsState } = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
};

export const usePlayerControls = () => {
  // Directly use the store's state
  const { forward, backward, left, right, jump, reset } = useControlsStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (action) {
        useControlsStore.setState({ [action]: true });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (action) {
        useControlsStore.setState({ [action]: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Gamepad support (simplified initial version)
    // More advanced gamepad logic (dead zones, mapping) can be added later
    let gamepadIndex: number | null = null;
    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gamepadIndex = i;
          break;
        }
      }
    };
    window.addEventListener('gamepadconnected', (e) => {
        checkGamepad();
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        (e as GamepadEvent).gamepad.index, (e as GamepadEvent).gamepad.id,
        (e as GamepadEvent).gamepad.buttons.length, (e as GamepadEvent).gamepad.axes.length);
    });
    window.addEventListener('gamepaddisconnected', () => {
        gamepadIndex = null;
        reset(); // Reset controls if gamepad disconnects
        console.log("Gamepad disconnected.");
    });

    // Initial check in case gamepad is already connected
    checkGamepad();

    const updateGamepadState = () => {
        if (gamepadIndex !== null) {
            const gamepad = navigator.getGamepads()[gamepadIndex];
            if (gamepad) {
                const newState = {
                    forward: gamepad.buttons[12]?.pressed || gamepad.axes[1] < -0.5,
                    backward: gamepad.buttons[13]?.pressed || gamepad.axes[1] > 0.5,
                    left: gamepad.buttons[14]?.pressed || gamepad.axes[0] < -0.5,
                    right: gamepad.buttons[15]?.pressed || gamepad.axes[0] > 0.5,
                    jump: gamepad.buttons[0]?.pressed, // Typically A button
                };
                useControlsStore.setState(newState);
            }
        }
        requestAnimationFrame(updateGamepadState);
    };

    const animationFrameId = requestAnimationFrame(updateGamepadState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', checkGamepad);
      window.removeEventListener('gamepaddisconnected', () => { gamepadIndex = null; reset(); });
      cancelAnimationFrame(animationFrameId);
    };
  }, [reset]); // Added reset to dependency array

  return { forward, backward, left, right, jump };
};

// Initialize and export the hook for use in components
export default usePlayerControls;
