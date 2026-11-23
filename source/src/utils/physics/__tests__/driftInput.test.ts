import { describe, expect, it } from 'vitest';
import { createDriftInputState, prepareDriftInput } from '../driftInput';
const input={throttle:1,brake:0,steering:0.8,handbrake:true,cameraToggle:false,reset:false};
describe('assisted Space input',()=>{
  it('keeps a held slide powered through neutral steering and entry-speed jitter',()=>{
    for(const direction of [-1,1]){
      const state=createDriftInputState();
      for(let i=0;i<20;i++)prepareDriftInput(state,{...input,steering:direction*0.8},1/60,40,true,true);
      for(const steering of [direction*0.1,0,-direction*0.1,-direction*0.8]){
        const output=prepareDriftInput(state,{...input,steering},1/60,19,true,true);
        expect(state.sustaining).toBe(true);expect(output.handbrake).toBe(false);
      }
      prepareDriftInput(state,input,1/60,11,true,true);
      expect(state.sustaining).toBe(false);expect(state.input.handbrake).toBe(true);
    }
  });
  it('flicks the rear brake then restores propulsion while Space is held',()=>{
    const state=createDriftInputState();
    expect(prepareDriftInput(state,input,1/60,50,true,true).handbrake).toBe(true);
    for(let i=0;i<15;i++)prepareDriftInput(state,input,1/60,50,true,true);
    expect(state.sustaining).toBe(true);expect(state.input.handbrake).toBe(false);
    expect(input.handbrake).toBe(true);
    prepareDriftInput(state,{...input,handbrake:false},1/60,50,true,true);
    expect(state.sustaining).toBe(false);expect(state.heldSeconds).toBe(0);
  });
  it('keeps the mechanical brake for parking, airborne cars and ESP-off driving',()=>{
    for(const [speed,grounded,esp] of [[8,true,true],[50,false,true],[50,true,false]] as const){
      const state=createDriftInputState();
      for(let i=0;i<120;i++)prepareDriftInput(state,input,1/60,speed,grounded,esp);
      expect(state.input.handbrake).toBe(true);expect(state.sustaining).toBe(false);
    }
  });
});
