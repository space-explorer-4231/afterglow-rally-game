import { clamp } from '@/utils/math';

function ramp(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Continuous arcade-sim combined-slip response; throttle alone must not erase cornering grip. */
export function powerSlideLateralScale(throttle: number, slipAngle: number, speedKmh: number,
  steerable: boolean, tcsEnabled: boolean): number {
  if (!Number.isFinite(throttle) || !Number.isFinite(slipAngle) || !Number.isFinite(speedKmh)) return 1;
  const demand = ramp((throttle - 0.1) / 0.9);
  const slide = ramp((Math.abs(slipAngle) - 0.04) / 0.36);
  const gripLoss = (steerable ? 0.30 : 0.55) * slide * (tcsEnabled ? 0.65 : 1);
  const launchSpin = tcsEnabled ? 0 : 0.06 * (1 - ramp((Math.abs(speedKmh) - 20) / 45));
  return clamp(1 - demand * (gripLoss + launchSpin), steerable ? 0.60 : 0.35, 1);
}
