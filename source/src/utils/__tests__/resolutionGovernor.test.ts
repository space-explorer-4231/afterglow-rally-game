import { describe, expect, it } from 'vitest';
import { updateResolutionGovernor } from '../resolutionGovernor';
describe('stable resolution under real frame stalls', () => {
  it('ignores isolated long stalls and does not resize on normal 30 FPS pacing', () => {
    const state={scale:1,slowSeconds:0,fastSeconds:0};
    updateResolutionGovernor(state,0.15,30);
    for(let i=0;i<1000;i++) updateResolutionGovernor(state,1/30,30);
    expect(state.scale).toBe(1);
  });
  it('reduces only after sustained overload, with a fixed lower bound', () => {
    const state={scale:1,slowSeconds:0,fastSeconds:0};
    for(let i=0;i<39;i++) updateResolutionGovernor(state,0.05,30);
    expect(state.scale).toBe(1);
    updateResolutionGovernor(state,0.05,30);
    expect(state.scale).toBeCloseTo(0.9);
    for(let i=0;i<1000;i++) updateResolutionGovernor(state,0.05,30);
    expect(state.scale).toBe(0.65);
  });
  it('requires twelve seconds of clear headroom before recovering resolution', () => {
    const state={scale:0.7,slowSeconds:0,fastSeconds:0};
    for(let i=0;i<600;i++) updateResolutionGovernor(state,0.01,30);
    expect(state.scale).toBe(0.7);
    for(let i=0;i<601;i++) updateResolutionGovernor(state,0.01,30);
    expect(state.scale).toBeCloseTo(0.75);
  });
});

it('uses measured mean cadence when overloaded and normal frames alternate',()=>{
 const state={scale:1,slowSeconds:0,fastSeconds:0};
 for(let i=0;i<100;i++)updateResolutionGovernor(state,i%2===0?.03:1/60,60);
 expect(state.scale).toBeCloseTo(.9);
});
it('responds to sustained48FPS when the player selected a60FPS target',()=>{
 const state={scale:1,slowSeconds:0,fastSeconds:0};
 for(let i=0;i<120;i++)updateResolutionGovernor(state,1/48,60);
 expect(state.scale).toBeCloseTo(.9);
});
it('keeps a normal jittering60FPS cadence sharp without repeated resize probes',()=>{
 const state={scale:1,slowSeconds:0,fastSeconds:0};
 for(let i=0;i<3600;i++)updateResolutionGovernor(state,i%2===0?.020:.0133333333,60);
 expect(state.scale).toBe(1);
});

it('probes capped60FPS upward slowly then rolls back sustained overload',()=>{
 const state={scale:.7,slowSeconds:0,fastSeconds:0};
 for(let i=0;i<719;i++)updateResolutionGovernor(state,1/60,60);
 expect(state.scale).toBe(.7);
 updateResolutionGovernor(state,1/60,60);expect(state.scale).toBeCloseTo(.75);
 for(let i=0;i<40;i++)updateResolutionGovernor(state,.05,60);
 expect(state.scale).toBeCloseTo(.65);
});
