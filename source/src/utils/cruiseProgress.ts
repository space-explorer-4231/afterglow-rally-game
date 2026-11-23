/** Personal, untimed free-roam progress. Teleports and paused time earn no credit. */
export interface CruiseProgress { distance: number; driftDistance: number; bestSpeed: number }

/** Advance optional driving goals from one bounded telemetry interval. */
export function advanceCruiseProgress(
  previous: CruiseProgress, speedKmh: number, slipAngle: number, deltaSeconds: number,
): CruiseProgress {
  if (![speedKmh, slipAngle, deltaSeconds].every(Number.isFinite) || deltaSeconds <= 0 || deltaSeconds > .5) return previous;
  const speed = Math.min(350, Math.max(0, speedKmh));
  const distance = speed / 3.6 * deltaSeconds;
  const drifting = speed >= 18 && Math.abs(slipAngle) >= .22 && Math.abs(slipAngle) < 1.4;
  return {
    distance: previous.distance + distance,
    driftDistance: previous.driftDistance + (drifting ? distance : 0),
    bestSpeed: Math.max(previous.bestSpeed, speed),
  };
}
