import {expect,it} from 'vitest';
import {advanceNitro,createNitroState,refillNitro,nitroAcceleration} from '../nitro';
it('provides peak launch thrust, smooth cruise thrust and a bounded speed ceiling',()=>{
  expect(nitroAcceleration(0,100)).toBe(7.5);
  expect(nitroAcceleration(18,100)).toBeCloseTo(4.5*(1-.18**2));
  expect(nitroAcceleration(100,100)).toBe(0);expect(nitroAcceleration(120,100)).toBe(0);
  expect(nitroAcceleration(NaN,100)).toBe(0);expect(nitroAcceleration(0,0)).toBe(0);
});
it.each([30,60,120])('provides exactly two five-second tanks at %s Hz',hz=>{
  const s=createNitroState();let supplied=0;
  for(let i=0;i<hz*12;i++)supplied+=advanceNitro(s,true,true,1/hz)/hz;
  expect(supplied).toBeCloseTo(10,7);expect(s.remaining).toBe(0);expect(s.active).toBe(false);
});
it('recharges partially used tanks on release and supplies the final fractional step',()=>{
  const s=createNitroState();for(let i=0;i<60;i++)advanceNitro(s,true,true,1/60);
  expect(s.remaining).toBeCloseTo(9);advanceNitro(s,false,true,1/60);expect(s.remaining).toBeCloseTo(9+1/72);expect(s.active).toBe(false);
  s.remaining=.005;expect(advanceNitro(s,true,true,.02)).toBeCloseTo(.25);expect(s.remaining).toBe(0);
});
it('does not burn fuel in excluded driving states or when time is invalid',()=>{
  const s=createNitroState();for(const dt of [0,-1,NaN,Infinity])advanceNitro(s,true,true,dt);
  advanceNitro(s,true,false,1/60);expect(s.remaining).toBe(10);expect(s.active).toBe(false);
  advanceNitro(s,true,true,100);expect(s.remaining).toBeCloseTo(10-1/30);
});
it('refills only through an explicit new-drive refill',()=>{
  const s=createNitroState();s.remaining=0;advanceNitro(s,true,true,.02);expect(s.remaining).toBe(0);
  refillNitro(s);expect(s.remaining).toBe(10);expect(s.active).toBe(false);
});
it.each([30,60,120])('recharges both tanks in 12 released seconds at %s Hz without unlimited held boost',hz=>{
  const s=createNitroState();s.remaining=0;
  for(let i=0;i<hz*6;i++)advanceNitro(s,false,true,1/hz);
  expect(s.remaining).toBeCloseTo(5,6);expect(s.active).toBe(false);
  for(let i=0;i<hz*6;i++)advanceNitro(s,false,false,1/hz);
  expect(s.remaining).toBeCloseTo(10,6);
  for(let i=0;i<hz*12;i++)advanceNitro(s,true,true,1/hz);
  expect(s.remaining).toBe(0);
  for(let i=0;i<hz*30;i++)advanceNitro(s,true,true,1/hz);
  expect(s.remaining).toBe(0);
});
