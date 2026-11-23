import { clamp } from '@/utils/math';
import { DRIFT_ANGLE_CONTROL as BALANCE } from '@/config/physicsBalance';

/** Driver-owned slide target, allocated once with each vehicle. */
export interface DriftAngleControl {
  active: boolean;
  target: number;
  /** Re-entry waits for a straight chassis after the driver cancels a slide. */
  recovering: boolean;
}

/** Allocate the reusable drift controller. */
export function createDriftAngleControl(): DriftAngleControl {
  return { active: false, target: 0, recovering: false };
}

/**
 * Steering adjusts slide angle rather than snapping a released wheel straight.
 * Opposite steering unwinds the same target continuously through zero. This
 * controls tire steering only; it never changes the body's velocity or heading.
 */
export function advanceDriftAngleControl(state: DriftAngleControl, steering: number,
  slip: number, handbrake: boolean, eligible: boolean, dt: number, allowPowerEntry = true): void {
  if (!eligible || !Number.isFinite(steering) || !Number.isFinite(slip) || !Number.isFinite(dt) || dt <= 0) {
    state.active = false; state.target = 0; state.recovering = false;
    return;
  }
  if (state.recovering) {
    if (Math.abs(slip) < BALANCE.exitSlip) { state.active = false; state.recovering = false; }
    return;
  }
  const input = clamp(steering, -1, 1);
  if (!state.active && !state.recovering && Math.abs(input) > 0.15
    && (handbrake || (allowPowerEntry && Math.abs(slip) > BALANCE.entrySlip && input * slip < 0))) {
    state.active = true;
    state.target = clamp(slip, -BALANCE.maximumSlip, BALANCE.maximumSlip);
    if (Math.abs(state.target) < BALANCE.minimumSlip) state.target = -Math.sign(input) * BALANCE.minimumSlip;
  }
  if (!state.active) return;
  if (Math.abs(input) > 0.06) {
    const previous = state.target;
    const recovery = driftRecoveryBlend(previous, input, handbrake);
    state.target = clamp(previous - input * BALANCE.adjustmentRate
      * (1 + recovery * (BALANCE.recoveryRateMultiplier - 1)) * Math.min(dt, 0.05), -BALANCE.maximumSlip, BALANCE.maximumSlip);
    // A tap can straighten a shallow slide without immediately latching it again.
    if (previous * state.target <= 0 && !handbrake) {
      state.target = 0; state.recovering = true;
    }
  }
}

/** Countersteering restores rear tire support; holding or deepening a drift stays unchanged. */
export function driftRecoveryBlend(target: number, steering: number, handbrake: boolean): number {
  if (handbrake || !Number.isFinite(target + steering) || target * steering <= 0) return 0;
  return clamp((Math.abs(steering) - .06) / .5, 0, 1);
}

/** Grip-limited desired yaw for maintaining or progressively correcting a slide. */
export function driftControlYaw(target: number, slip: number, speed: number, grip: number): number {
  const limit = 9.81 * grip / Math.max(4, speed);
  return clamp(-target * BALANCE.curvatureResponse + (slip - target) * BALANCE.slipResponse, -limit, limit);
}
