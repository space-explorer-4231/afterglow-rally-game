import { describe, it, expect } from 'vitest';
import { advanceCruiseProgress } from '../cruiseProgress';

describe('Untimed cruise goals', () => {
  const empty = { distance: 0, driftDistance: 0, bestSpeed: 0 };
  it('converts speed into distance and credits controlled slides', () => {
    const result = advanceCruiseProgress(empty, 72, .4, .2);
    expect(result).toEqual({ distance: 4, driftDistance: 4, bestSpeed: 72 });
  });
  it('does not count stationary steering, spinning or delayed background updates as drifting', () => {
    expect(advanceCruiseProgress(empty, 2, .4, .2).driftDistance).toBe(0);
    expect(advanceCruiseProgress(empty, 72, 2, .2).driftDistance).toBe(0);
    expect(advanceCruiseProgress(empty, 72, .4, 8)).toBe(empty);
    expect(advanceCruiseProgress(empty, NaN, .4, .2)).toBe(empty);
  });
});
