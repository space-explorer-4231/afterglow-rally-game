import {it,expect} from 'vitest';
import {spinCatchImpulse} from '../spinCatch';
it('leaves normal cornering and modest drifts untouched',()=>{expect(spinCatchImpulse(.25,.3,25,1000,1/60)).toBe(0);expect(spinCatchImpulse(0,0,30,1000,1/60)).toBe(0);});
it('opposes runaway yaw while preserving a bounded recovery turn',()=>{expect(spinCatchImpulse(-.9,3,25,1000,1/60)).toBeLessThan(0);expect(spinCatchImpulse(.9,-3,25,1000,1/60)).toBeGreaterThan(0);});
it.each([30,60,120])('is finite and dissipates excess angular energy at %s Hz',hz=>{let yaw=4;for(let i=0;i<hz;i++)yaw+=spinCatchImpulse(0,yaw,25,1000,1/hz)/1000;expect(Math.abs(yaw)).toBeLessThan(3);expect(Number.isFinite(yaw)).toBe(true);});
it('ignores standstill, invalid time and invalid telemetry',()=>{for(const impulse of [spinCatchImpulse(1,3,0,1000,.016),spinCatchImpulse(1,3,25,1000,0),spinCatchImpulse(NaN,3,25,1000,.016)])expect(impulse).toBe(0);});
