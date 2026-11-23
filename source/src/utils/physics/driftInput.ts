import type { InputState } from '@/types/game';
import { ROAD_HANDLING } from '@/config/physicsBalance';

/** Per-car reusable assisted handbrake state. */
export interface DriftInputState {
  heldSeconds: number;
  sustaining: boolean;
  input: InputState;
}

/** Allocate once when attaching a car. */
export function createDriftInputState(): DriftInputState {
  return { heldSeconds: 0, sustaining: false, input: {
    throttle: 0, brake: 0, steering: 0, handbrake: false, cameraToggle: false, reset: false,
  } };
}

/** Space initiates a rear lock then restores drive; ESP-off keeps a manual brake. */
export function prepareDriftInput(state: DriftInputState, source: InputState,
  dt: number, speedKmh: number, grounded: boolean, espEnabled: boolean): InputState {
  // Hysteresis avoids re-locking the rear wheels as a held slide crosses its
  // entry speed or the steering passes through center during a direction change.
  const speedThreshold = state.sustaining ? ROAD_HANDLING.driftExitSpeedKmh : ROAD_HANDLING.driftMinimumSpeedKmh;
  const steerEligible = state.sustaining || Math.abs(source.steering) > 0.08;
  const eligible = source.handbrake && source.brake < 0.05 && source.throttle > 0.1
    && steerEligible && speedKmh > speedThreshold && grounded && espEnabled;
  state.heldSeconds = eligible ? state.heldSeconds + Math.max(0, Math.min(0.05, dt)) : 0;
  state.sustaining = eligible && state.heldSeconds > ROAD_HANDLING.driftLockSeconds;
  Object.assign(state.input, source);
  state.input.handbrake = source.handbrake && !state.sustaining;
  return state.input;
}
