import { clamp } from '@/utils/math';
import { ROAD_HANDLING } from '@/config/physicsBalance';

/**
 * Keyboard-friendly virtual caster. It aligns a released wheel with the slide,
 * yields to deliberate steering, and stays off during handbrake initiation/reverse.
 * Slip and steering signs follow OpenRally's +Y-up, +Z-forward convention.
 */
export function assistDriftSteering(
  rawAngle: number, steering: number, slip: number, forwardSpeed: number,
  handbrake: boolean, enabled: boolean, maxLock: number,
): number {
  if (!enabled || forwardSpeed <= 2 || !Number.isFinite(slip)) return rawAngle;
  // Preserve the initial handbrake flick, then progressively catch a growing slide.
  // Unlike neutral-wheel caster, this rescue still operates at full keyboard lock.
  if (handbrake) {
    const recovery = clamp((Math.abs(slip) - ROAD_HANDLING.handbrakeRecoveryStart) / ROAD_HANDLING.handbrakeRecoveryRange, 0, 1);
    const aligned = clamp(slip, -maxLock, maxLock);
    return clamp(rawAngle + (aligned - rawAngle) * recovery * ROAD_HANDLING.handbrakeCasterAuthority, -maxLock, maxLock);
  }
  const slide = clamp((Math.abs(slip) - 0.05) / 0.30, 0, 1);
  const speed = clamp((forwardSpeed - 2) / 6, 0, 1);
  const driverAuthority = clamp(1 - Math.abs(steering), 0, 1);
  // Let the player intentionally hold steering into a donut or tighter turn.
  if (Math.abs(steering) > 0.25 && steering * slip < 0) return rawAngle;
  const blend = 0.70 * slide * speed * driverAuthority;
  const aligned = clamp(slip, -maxLock, maxLock);
  return clamp(rawAngle + (aligned - rawAngle) * blend, -maxLock, maxLock);
}
