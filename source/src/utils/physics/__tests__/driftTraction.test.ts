import {describe,expect,it} from 'vitest';
import {getDriftAccelerationLimit,getDriftYawReference} from '../driftTraction';
describe('tire-limited drift assistance',()=>{
  it('widens high-speed cornering instead of demanding lateral acceleration beyond 1 g',()=>{
    for(const speed of [3,8,15,25,40,60])for(const steering of [-1,-0.6,0,0.6,1]){
      const reference=getDriftYawReference(speed,steering);
      expect(Math.abs(reference)*speed).toBeLessThanOrEqual(9.81+1e-8);
      expect(reference).toBeCloseTo(-getDriftYawReference(speed,-steering),10);
    }
    expect(Math.abs(getDriftYawReference(40,1))).toBeLessThan(Math.abs(getDriftYawReference(15,1)));
  });
  it('removes lateral assistance in the air and scales it with grounded wheel contact',()=>{
    expect(getDriftAccelerationLimit(0)).toBe(0);
    expect(getDriftAccelerationLimit(0.25)).toBeCloseTo(9.81/4);
    expect(getDriftAccelerationLimit(1)).toBe(9.81);
    expect(getDriftAccelerationLimit(5)).toBe(9.81);
    expect(getDriftAccelerationLimit(Number.NaN)).toBe(0);
    expect(getDriftYawReference(Infinity,1)).toBe(0);
    expect(getDriftYawReference(20,Number.NaN)).toBe(0);
  });
});
