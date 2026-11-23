import { describe, expect, it } from 'vitest';
import { advanceDriftAngleControl, createDriftAngleControl, driftControlYaw, driftRecoveryBlend } from '../driftAngleControl';

describe('steering-controlled slide angle', () => {
  it.each([-1,1])('unwinds a slide more quickly without changing held or deepening drift in direction %s', sign => {
    const recovering = {active:true,target:sign*.4,recovering:false};
    const deepening = {active:true,target:sign*.4,recovering:false};
    for(let i=0;i<20;i++) {
      advanceDriftAngleControl(recovering,sign,sign*.4,false,true,1/60);
      advanceDriftAngleControl(deepening,-sign,sign*.4,false,true,1/60);
    }
    expect(Math.abs(recovering.target)).toBeLessThan(.12);
    expect(Math.abs(deepening.target)).toBeCloseTo(.48);
    expect(driftRecoveryBlend(sign*.4,sign,false)).toBe(1);
    expect(driftRecoveryBlend(sign*.4,-sign,false)).toBe(0);
    expect(driftRecoveryBlend(sign*.4,0,false)).toBe(0);
    expect(driftRecoveryBlend(sign*.4,sign,true)).toBe(0);
  });
  it.each([-1, 1])('holds released steering and progressively adjusts both ways from direction %s', sign => {
    const state = createDriftAngleControl();
    advanceDriftAngleControl(state, sign, -sign * .2, true, true, 1 / 60);
    const entry = state.target;
    for (let i = 0; i < 120; i++) advanceDriftAngleControl(state, 0, entry, false, true, 1 / 60);
    expect(state.active).toBe(true);
    expect(state.target).toBe(entry);
    for (let i = 0; i < 10; i++) advanceDriftAngleControl(state, sign, entry, false, true, 1 / 60);
    expect(Math.abs(state.target)).toBeGreaterThan(Math.abs(entry));
    const deep = state.target;
    for (let i = 0; i < 10; i++) advanceDriftAngleControl(state, -sign, deep, false, true, 1 / 60);
    expect(Math.abs(state.target)).toBeLessThan(Math.abs(deep));
    for (let i = 0; i < 100; i++) advanceDriftAngleControl(state, -sign, deep, false, true, 1 / 60);
    expect(state.recovering).toBe(true); expect(state.target).toBe(0);
    // Continuing opposite steering may initiate the opposite slide once straight.
    advanceDriftAngleControl(state, -sign, 0, false, true, 1 / 60);
    advanceDriftAngleControl(state, -sign, sign*.22, false, true, 1 / 60);
    expect(state.active).toBe(true); expect(Math.sign(state.target)).toBe(sign);
  });
  it('does not drift during tiny straight-line disturbances and clears on braking/air/reverse', () => {
    const state = createDriftAngleControl();
    advanceDriftAngleControl(state, .08, .017, false, true, 1 / 60);
    expect(state.active).toBe(false);
    advanceDriftAngleControl(state, 1, -.2, true, true, 1 / 60);
    advanceDriftAngleControl(state, 0, -.2, false, false, 1 / 60);
    expect(state.active).toBe(false); expect(state.target).toBe(0);
  });
  it('requires intentional handbrake entry for front-wheel drive', () => {
    const state=createDriftAngleControl();
    advanceDriftAngleControl(state,1,-.3,false,true,1/60,false);
    expect(state.active).toBe(false);
    advanceDriftAngleControl(state,1,-.3,true,true,1/60,false);
    expect(state.active).toBe(true);
  });
  it.each([30,60,120])('adjusts targets at the same rate at %s Hz', hz => {
    const state = {active:true,target:-.15,recovering:false};
    for (let i=0;i<hz/2;i++) advanceDriftAngleControl(state,.5,-.15,false,true,1/hz);
    expect(state.target).toBeCloseTo(-.27,6);
  });
  it('limits requested curvature to tire acceleration and mirrors left/right', () => {
    for (const speed of [10,30,60]) {
      const yaw=driftControlYaw(-.4,-.2,speed,.8);
      expect(yaw).toBeGreaterThan(0);
      expect(yaw*speed).toBeLessThanOrEqual(9.81*.8);
      expect(driftControlYaw(.4,.2,speed,.8)).toBe(-yaw);
      expect(driftControlYaw(0,-.3,speed,.8)).toBeLessThan(0);
    }
  });
});
