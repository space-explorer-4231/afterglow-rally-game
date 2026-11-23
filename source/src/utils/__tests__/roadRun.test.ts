import {describe,it,expect} from 'vitest';
import {createRoadRun,advanceRoadRun,interruptRoadRun,parseRoadRunBest,type RoadRunSample} from '../roadRun';
function lap(offRoad=false){
  const run=createRoadRun(),sample:RoadRunSample={progress:0,distance:0,x:0,z:0,speed:72,dt:.2,eligible:true,reset:false};
  for(let i=0;i<=401;i++){
    sample.progress=(i/400)%1;sample.x=Math.sin(i/400*Math.PI*2)*100;sample.z=Math.cos(i/400*Math.PI*2)*100;
    sample.distance=offRoad&&i>100&&i<200?20:0;advanceRoadRun(run,sample,7);
  }return run;
}
describe('Four-sector Road Run',()=>{
  it('records four ordered sectors, complete time and on-road accuracy',()=>{
    const r=lap();expect(r.quarter).toBe(4);expect(r.splits.every((v,i)=>v>0&&(i===0||v>r.splits[i-1]))).toBe(true);
    expect(r.lastTime).toBeCloseTo(79.8,1);expect(r.lastAccuracy).toBe(100);expect(r.best).toBe(r.lastTime);
  });
  it('keeps off-road finishes visible but excludes them from personal bests',()=>{const r=lap(true);expect(r.lastTime).not.toBeNull();expect(r.lastAccuracy).toBeLessThan(90);expect(r.best).toBeNull();});
  it.each(['reset','ineligible','teleport','reverse','hidden-tab-gap','nan'] as const)('discards a partial run after %s',kind=>{
    const r=createRoadRun();r.active=true;r.anchored=true;r.previous=.4;r.elapsed=5;
    const s:RoadRunSample={progress:.402,distance:0,x:1,z:0,speed:72,dt:.2,eligible:true,reset:false};
    if(kind==='reset')s.reset=true;if(kind==='ineligible')s.eligible=false;if(kind==='teleport')s.x=500;if(kind==='reverse')s.progress=.3;if(kind==='hidden-tab-gap')s.dt=2;if(kind==='nan')s.progress=NaN;
    advanceRoadRun(r,s,7);expect(r.active).toBe(false);expect(r.best).toBeNull();
  });
  it('does not turn a shortcut over missed quarters into a record',()=>{const r=createRoadRun();r.active=true;r.anchored=true;r.previous=.99;r.quarter=1;r.elapsed=40;advanceRoadRun(r,{progress:.001,distance:0,x:1,z:0,speed:72,dt:.2,eligible:true,reset:false},7);expect(r.best).toBeNull();expect(r.lastTime).toBeNull();});
  it('retains an earned best through interruptions without recording the partial attempt',()=>{const r=lap();const best=r.best;interruptRoadRun(r);expect(r.active).toBe(false);expect(r.best).toBe(best);});
  it.each([null,'bad','NaN','Infinity','-3','0','999999'])('rejects corrupt saved record %s',raw=>expect(parseRoadRunBest(raw)).toBeNull());
  it('loads a plausible record and never lets a slower lap replace it',()=>{const r=lap();expect(parseRoadRunBest('42.17')).toBe(42.17);const best=r.best;r.active=true;r.anchored=true;r.previous=.999;r.quarter=3;r.elapsed=100;r.total=100;r.onRoad=100;advanceRoadRun(r,{progress:.001,distance:0,x:r.x+1,z:r.z,speed:72,dt:.2,eligible:true,reset:false},7);expect(r.best).toBe(best);});
});
