import { ROAD_HANDLING } from '@/config/physicsBalance';
import { clamp } from '@/utils/math';

/** A cornering reference, v / R, bounded by available lateral acceleration / v. */
export function getDriftYawReference(speedMps: number, steering: number): number {
  if (!Number.isFinite(speedMps) || !Number.isFinite(steering) || speedMps <= 1) return 0;
  const steer = clamp(steering, -1, 1);
  const radius = ROAD_HANDLING.handbrakeMinimumRadius + (1 - Math.abs(steer)) * ROAD_HANDLING.handbrakeRadiusRange;
  const rate = Math.min(speedMps / radius, ROAD_HANDLING.driftMaximumLateralAcceleration / speedMps);
  return steer * rate;
}

/** Assistance may use only the fraction of tire load with wheels on the ground. */
export function getDriftAccelerationLimit(groundedRatio: number): number {
  return Number.isFinite(groundedRatio)
    ? ROAD_HANDLING.driftMaximumLateralAcceleration * clamp(groundedRatio, 0, 1)
    : 0;
}
