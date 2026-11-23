import {it,expect} from 'vitest';
import {straightLineAssistBlend} from '../straightLineAssist';
it('retains full near-straight stability inside one degree and fades by four',()=>{
  for(const sign of [-1,1]){
    expect(straightLineAssistBlend(0,sign*Math.PI/180,false)).toBeCloseTo(1);
    expect(straightLineAssistBlend(sign*Math.PI/180,0,false)).toBeCloseTo(1);
    expect(straightLineAssistBlend(0,sign*2.5*Math.PI/180,false)).toBeCloseTo(.5);
    expect(straightLineAssistBlend(0,sign*4*Math.PI/180,false)).toBe(0);
    expect(straightLineAssistBlend(sign*4*Math.PI/180,0,false)).toBe(0);
  }
});
it('releases stability for handbrake entry and rejects invalid telemetry',()=>{
  expect(straightLineAssistBlend(0,0,true)).toBe(0);
  expect(straightLineAssistBlend(NaN,0,false)).toBe(0);
  expect(straightLineAssistBlend(0,Infinity,false)).toBe(0);
});
