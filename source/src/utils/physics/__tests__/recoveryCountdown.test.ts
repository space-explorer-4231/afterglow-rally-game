import {it,expect} from 'vitest';
import {advanceRecoverySeconds} from '../recoveryCountdown';
it.each([30,60,120])('holds recovery for three seconds at %s physics steps/sec',hz=>{
 let remaining=3;for(let i=0;i<hz*3-1;i++)remaining=advanceRecoverySeconds(remaining,1/hz);
 expect(remaining).toBeCloseTo(1/hz);expect(Math.ceil(remaining)).toBe(1);
 remaining=advanceRecoverySeconds(remaining,1/hz);expect(remaining).toBeCloseTo(0);expect(Math.ceil(remaining)).toBe(0);
 expect(advanceRecoverySeconds(remaining,1/hz)).toBe(0);
});
it('does not consume recovery on invalid or paused steps',()=>{for(const dt of [0,-1,NaN,Infinity])expect(advanceRecoverySeconds(3,dt)).toBe(3);});
