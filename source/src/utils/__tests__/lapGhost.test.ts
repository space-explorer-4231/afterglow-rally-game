import {describe,it,expect} from 'vitest';
import {appendLapGhost,beginLapGhost,createLapGhostRecorder,finishLapGhost,recordGhostSplit,sampleLapGhost,parseLapGhost,serializeLapGhost,GHOST_MAX_SAMPLES,GHOST_STRIDE,type GhostPose,type LapGhostRecord} from '../lapGhost';
const pose:GhostPose={x:0,y:1,z:0,qx:0,qy:0,qz:0,qw:1};
function run(duration=4){
  const recorder=createLapGhostRecorder(4);beginLapGhost(recorder);
  for(let i=0;i<=duration*10;i++)appendLapGhost(recorder,i/10,{...pose,z:i*2},true);
  for(let i=1;i<=4;i++)recordGhostSplit(recorder,i%4,duration*i/4);
  return {recorder,record:finishLapGhost(recorder,duration)!};
}
describe('bounded personal lap replay',()=>{
  it('retains a complete clean run and checkpoint times',()=>{const {record}=run();expect(record.duration).toBe(4);expect(Array.from(record.splits)).toEqual([4,1,2,3]);});
  it('samples positions between captured frames without replacing output memory',()=>{
    const {record}=run(),out={...pose};expect(sampleLapGhost(record,1.25,out)).toBe(true);expect(out.z).toBeCloseTo(25);expect(out.y).toBe(1);
    expect(sampleLapGhost(record,4,out)).toBe(true);expect(out.z).toBe(80);
  });
  it('does not wrap the ghost into a new lap after its finish',()=>{const {record}=run();for(const t of [-1,4.01,NaN,Infinity])expect(sampleLapGhost(record,t,{...pose})).toBe(false);});
  it('interpolates equivalent opposite-sign quaternions without spinning',()=>{
    const {record}=run();record.poses[15]=-1;const out={...pose};sampleLapGhost(record,0.05,out);expect(Math.abs(out.qw)).toBeCloseTo(1);expect(out.qy).toBe(0);
  });
  it('normalizes an interpolated ninety-degree turn',()=>{
    const {record}=run();record.poses[13]=Math.SQRT1_2;record.poses[15]=Math.SQRT1_2;
    const out={...pose};sampleLapGhost(record,0.05,out);expect(Math.hypot(out.qx,out.qy,out.qz,out.qw)).toBeCloseTo(1);expect(out.qy).toBeCloseTo(Math.sin(Math.PI/8));
  });
  it('paces capture to ten Hz at 120 render frames per second',()=>{
    const r=createLapGhostRecorder(4),memory=r.poses;for(let i=0;i<=1200;i++)appendLapGhost(r,i/120,{...pose,z:i/12});
    expect(r.count).toBeGreaterThan(90);expect(r.count).toBeLessThanOrEqual(101);expect(r.poses).toBe(memory);expect(r.invalid).toBe(false);
  });
  it('reuses recording memory on a new lap',()=>{const {recorder}=run(),data=recorder.poses;beginLapGhost(recorder);expect(recorder.poses).toBe(data);expect(recorder.count).toBe(0);expect(Array.from(recorder.splits)).toEqual([0,0,0,0]);});
  it('never finalizes an incomplete checkpoint sequence',()=>{const {recorder}=run();recorder.splits[0]=0;expect(finishLapGhost(recorder,4)).toBeNull();});
  it('ignores repeated or out-of-order checkpoint events',()=>{const r=createLapGhostRecorder(4);expect(recordGhostSplit(r,2,1)).toBe(false);expect(recordGhostSplit(r,1,1)).toBe(true);expect(recordGhostSplit(r,1,2)).toBe(false);expect(r.nextCheckpoint).toBe(2);});
  it('rejects decreasing checkpoint times',()=>{const r=createLapGhostRecorder(4);recordGhostSplit(r,1,2);expect(recordGhostSplit(r,2,1)).toBe(false);expect(r.invalid).toBe(true);});
  it('rejects a teleport rather than drawing a replay through the map',()=>{const r=createLapGhostRecorder(4);appendLapGhost(r,0,pose);expect(appendLapGhost(r,.1,{...pose,z:100})).toBe(false);expect(r.invalid).toBe(true);});
  it.each([NaN,Infinity,-1,601])('rejects invalid capture time %s',time=>{const r=createLapGhostRecorder(4);expect(appendLapGhost(r,time,pose)).toBe(false);expect(r.invalid).toBe(true);});
  it('requires an initial pose at race time zero',()=>{const r=createLapGhostRecorder(4);expect(appendLapGhost(r,2,pose)).toBe(false);});
  it('rejects missing recording gaps and backwards timer jumps',()=>{for(const time of [1.1,-.1]){const r=createLapGhostRecorder(4);appendLapGhost(r,0,pose);expect(appendLapGhost(r,time,pose)).toBe(false);expect(r.invalid).toBe(true);}});
  it('rejects invalid quaternions or world positions',()=>{for(const p of [{...pose,qw:0},{...pose,qw:NaN},{...pose,x:Infinity},{...pose,y:10000}]){const r=createLapGhostRecorder(4);expect(appendLapGhost(r,0,p)).toBe(false);}});
  it('caps recording memory and marks overflow invalid',()=>{const r=createLapGhostRecorder(4);r.count=GHOST_MAX_SAMPLES;expect(appendLapGhost(r,0,pose)).toBe(false);expect(r.poses.length).toBe(GHOST_MAX_SAMPLES*GHOST_STRIDE);});
  it('invalidated laps cannot replace a clean ghost',()=>{const {recorder}=run();recorder.invalid=true;expect(finishLapGhost(recorder,4)).toBeNull();});
  it('round-trips a bounded persisted ghost',()=>{const {record}=run();const restored=parseLapGhost(serializeLapGhost(record),4);expect(restored?.duration).toBe(4);expect(restored?.poses.length).toBe(record.poses.length);});
  it.each([null,'{','{}','null','[]','{"duration":null}','x'.repeat(700001)])('rejects malformed storage',raw=>{expect(parseLapGhost(raw,4)).toBeNull();});
  it('rejects data for a different track checkpoint layout',()=>{expect(parseLapGhost(serializeLapGhost(run().record),5)).toBeNull();});
  it('rejects oversized or nonfinite stored arrays before allocation',()=>{
    const {record}=run();for(const poses of [[...record.poses,0],Array(GHOST_MAX_SAMPLES*8+8).fill(0),['bad',...record.poses.slice(1)]])expect(parseLapGhost(JSON.stringify({...record,poses,splits:Array.from(record.splits)}),4)).toBeNull();
  });
  it('rejects a replay whose finish differs from the declared time',()=>{const {record}=run();expect(parseLapGhost(serializeLapGhost({...record,duration:5}),4)).toBeNull();});
  it('supports a full ten-minute lap within its fixed arena',()=>{
    const r=createLapGhostRecorder(4);for(let i=0;i<=6000;i++)appendLapGhost(r,i/10,{...pose,z:i/10},true);
    for(let i=1;i<=4;i++)recordGhostSplit(r,i%4,i*150);
    const record=finishLapGhost(r,600);expect(record?.duration).toBe(600);expect(parseLapGhost(serializeLapGhost(record as LapGhostRecord),4)).not.toBeNull();
  });
});
