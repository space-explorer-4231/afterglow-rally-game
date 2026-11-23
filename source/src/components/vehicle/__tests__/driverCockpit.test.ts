import { describe, expect, it } from 'vitest';
import { isDriverCabinVisible } from '../DriverCockpit';

describe('optional driver-seat cabin visibility', () => {
  it('shows the cabin only for an explicitly chosen driver-seat view', () => {
    expect(isDriverCabinVisible('first_person', 'playing', false)).toBe(true);
    expect(isDriverCabinVisible('first_person', 'paused', false)).toBe(true);
    for (const mode of ['chase_close', 'chase', 'bumper', 'free'] as const) {
      expect(isDriverCabinVisible(mode, 'playing', false)).toBe(false);
    }
  });
  it('never covers the garage, loading presentation or spectator camera', () => {
    for (const state of ['title', 'menu', 'loading'] as const) {
      expect(isDriverCabinVisible('first_person', state, false)).toBe(false);
    }
    expect(isDriverCabinVisible('first_person', 'playing', true)).toBe(false);
  });
});
