import { describe, it, expect } from 'vitest';
import { powerSlideLateralScale as grip } from '../powerSlideGrip';
describe('progressive powered tire grip', () => {
  it('preserves almost all directional grip when accelerating straight', () => {
    expect(grip(1,0,25,false,false)).toBeGreaterThan(0.93);
    expect(grip(1,0,90,false,false)).toBe(1);
  });
  it('progressively allows rear slip but preserves more front authority', () => {
    expect(grip(1,0.4,50,false,false)).toBeLessThan(grip(1,0.12,50,false,false));
    expect(grip(1,0.4,50,true,false)).toBeGreaterThan(grip(1,0.4,50,false,false));
    expect(grip(1,0.4,50,false,true)).toBeGreaterThan(grip(1,0.4,50,false,false));
    expect(grip(0,0.4,50,false,false)).toBe(1);
  });
  it('has no old 65 km/h or 45 percent throttle grip step and handles invalid telemetry', () => {
    expect(Math.abs(grip(1,.3,64.999,false,false)-grip(1,.3,65.001,false,false))).toBeLessThan(.001);
    expect(Math.abs(grip(.44999,.3,30,false,false)-grip(.45001,.3,30,false,false))).toBeLessThan(.001);
    expect(grip(NaN,.3,30,false,false)).toBe(1);
  });
});
