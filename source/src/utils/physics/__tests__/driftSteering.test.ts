import { describe, expect, it } from 'vitest';
import { assistDriftSteering as steer } from '../driftSteering';

describe('friendly drift steering', () => {
  it('helps a released wheel recover either direction without overcorrecting', () => {
    for (const slip of [-0.6, -0.3, 0.3, 0.6]) {
      const value = steer(0, 0, slip, 15, false, true, 0.63);
      expect(Math.sign(value)).toBe(Math.sign(slip));
      expect(Math.abs(value)).toBeLessThan(Math.abs(slip));
    }
  });
  it('preserves full driver lock and deliberate handbrake initiation', () => {
    expect(steer(0.5, 1, 0.4, 15, false, true, 0.63)).toBe(0.5);
    expect(steer(-0.5, -1, 0.4, 15, false, true, 0.63)).toBe(-0.5);
    expect(steer(0.2, 0.4, 0.4, 15, true, true, 0.63)).toBe(0.2);
  });
  it('does not interfere with reverse, low speed, straight driving or disabled assists', () => {
    for (const speed of [-15, 0, 2]) expect(steer(0, 0, 0.5, speed, false, true, 0.63)).toBe(0);
    expect(steer(0, 0, 0.01, 15, false, true, 0.63)).toBe(0);
    expect(steer(0, 0, 0.5, 15, false, false, 0.63)).toBe(0);
  });
});
