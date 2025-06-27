import { useEffect } from 'react';
import create from 'zustand';

// Extend ControlsState to include attack
interface ControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean; // Added attack state
  reset: () => void;
  // Method to reset a specific control, useful for momentary actions like attack
  resetKey: (key: keyof Omit<ControlsState, 'reset' | 'resetKey'>) => void;
}

export const useControlsStore = create<ControlsState>()((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  attack: false, // Default attack to false
  reset: () => set({ forward: false, backward: false, left: false, right: false, jump: false, attack: false }),
  resetKey: (key) => set({ [key]: false }),
}));

// Update KeyMap type to include 'attack'
const keyMap: { [key: string]: keyof Omit<ControlsState, 'reset' | 'resetKey'> } = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  KeyE: 'attack', // Added E key for attack
  // MouseButton0: 'attack', // Example for mouse click, needs different event listener
};

// Gamepad button mapping (example: X button on Xbox/PS controller)
const gamepadButtonMap: { [buttonIndex: number]: keyof Omit<ControlsState, 'reset' | 'resetKey'> } = {
  2: 'attack', // Typically X button (Xbox) or Square (PlayStation)
  0: 'jump',   // Typically A button (Xbox) or X (PlayStation)
  // Movement buttons (d-pad)
  12: 'forward',
  13: 'backward',
  14: 'left',
  15: 'right',
};


export const usePlayerControls = () => {
  const controls = useControlsStore((state) => ({
    forward: state.forward,
    backward: state.backward,
    left: state.left,
    right: state.right,
    jump: state.jump,
    attack: state.attack,
  }));
  const reset = useControlsStore((state) => state.reset);
  const resetKey = useControlsStore((state) => state.resetKey);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (action) {
        // For 'attack', we want it to be a momentary press, then reset.
        // Other keys are held down.
        if (action === 'attack') {
          if (!useControlsStore.getState().attack) { // Prevent re-triggering if already attacking
            useControlsStore.setState({ [action]: true });
          }
        } else {
          useControlsStore.setState({ [action]: true });
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (action) {
        if (action !== 'attack') { // Attack is reset by PlayerController after duration
            useControlsStore.setState({ [action]: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let gamepadIndex: number | null = null;
    const previousButtonStates: { [key: string]: boolean } = {};

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gamepadIndex = i;
          console.log(`Gamepad connected: ${gamepads[i]?.id}`);
          // Initialize previous states for buttons we care about
          Object.values(gamepadButtonMap).forEach(actionName => {
            previousButtonStates[actionName] = false;
          });
          break;
        }
      }
    };

    const handleGamepadConnected = (e: GamepadEvent) => {
      gamepadIndex = e.gamepad.index;
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                  e.gamepad.index, e.gamepad.id,
                  e.gamepad.buttons.length, e.gamepad.axes.length);
      Object.values(gamepadButtonMap).forEach(actionName => {
        previousButtonStates[actionName] = false;
      });
    };

    const handleGamepadDisconnected = () => {
      console.log("Gamepad disconnected.");
      gamepadIndex = null;
      reset();
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected as EventListener);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected as EventListener);

    checkGamepad(); // Initial check

    const updateGamepadState = () => {
      if (gamepadIndex !== null) {
        const gamepad = navigator.getGamepads()[gamepadIndex];
        if (gamepad) {
          const newStates: Partial<ControlsState> = {};

          // Handle axes for movement
          newStates.forward = gamepad.axes[1] < -0.5;
          newStates.backward = gamepad.axes[1] > 0.5;
          newStates.left = gamepad.axes[0] < -0.5;
          newStates.right = gamepad.axes[0] > 0.5;

          // Handle buttons (pressed once logic for attack and jump)
          for (const buttonIdx in gamepadButtonMap) {
            const action = gamepadButtonMap[buttonIdx];
            const isPressed = gamepad.buttons[buttonIdx]?.pressed;

            if (action === 'attack' || action === 'jump') {
              if (isPressed && !previousButtonStates[action]) {
                newStates[action] = true; // Trigger on press
              } else if (!isPressed && previousButtonStates[action] && action !== 'attack') {
                // For jump, reset on release. Attack is reset by PlayerController.
                 newStates[action] = false;
              }
            } else { // For d-pad like movement buttons, treat as continuous
                if (isPressed !== previousButtonStates[action]) {
                     newStates[action] = isPressed;
                }
            }
            previousButtonStates[action] = isPressed || false;
          }
          useControlsStore.setState(newStates);
        }
      }
      requestAnimationFrame(updateGamepadState);
    };

    const animationFrameId = requestAnimationFrame(updateGamepadState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', handleGamepadConnected as EventListener);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected as EventListener);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reset, resetKey]);

  return controls;
};

// Initialize and export the hook for use in components
export default usePlayerControls;
