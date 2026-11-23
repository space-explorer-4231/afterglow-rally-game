import {describe,it,expect} from 'vitest';
import {createRoadMastery,createRoadMasteryTracker,advanceRoadMastery,parseRoadMastery,roadMasteryBadges,roadMasteryRank} from '../roadMastery';
import type {RoadMasterySample} from '../roadMastery';
const sample:RoadMasterySample={x:0,z:0,speed:72,angle:.4,dt:.2,grounded:true,forward:true,nitro:true,reset:false};
describe('Road Mastery',()=>{
  it('anchors before counting physical distance and tracks controlled slides and boost',()=>{
    const p=createRoadMastery(),t=createRoadMasteryTracker();advanceRoadMastery(p,t,sample);
    expect(p.distance).toBe(0);advanceRoadMastery(p,t,{...sample,z:4});
    expect(p).toEqual({distance:4,driftDistance:4,boostSeconds:.2});
  });
  it.each([{reset:true},{grounded:false},{forward:false},{dt:8},{speed:NaN},{angle:Infinity}])('rejects invalid or excluded driving %j',overrides=>{
    const p=createRoadMastery(),t=createRoadMasteryTracker();advanceRoadMastery(p,t,sample);
    advanceRoadMastery(p,t,{...sample,z:4,...overrides});expect(p).toEqual(createRoadMastery());
  });
  it('rejects spawn teleports and counts only the following normal movement',()=>{
    const p=createRoadMastery(),t=createRoadMasteryTracker();advanceRoadMastery(p,t,sample);
    advanceRoadMastery(p,t,{...sample,z:1000});expect(p.distance).toBe(0);
    advanceRoadMastery(p,t,{...sample,z:1004});expect(p.distance).toBe(4);
  });
  it('does not credit stationary boost, spins or drift outside the speed range',()=>{
    const p=createRoadMastery(),t=createRoadMasteryTracker();advanceRoadMastery(p,t,sample);
    advanceRoadMastery(p,t,sample);expect(p.boostSeconds).toBe(0);
    advanceRoadMastery(p,t,{...sample,z:4,angle:2});expect(p.driftDistance).toBe(0);
    advanceRoadMastery(p,t,{...sample,z:8,speed:250});expect(p.driftDistance).toBe(0);
  });
  it('keeps fractional progress and awards each tier exactly once across reloads',()=>{
    const p=parseRoadMastery('{"distance":5000,"driftDistance":500,"boostSeconds":5}');
    expect(roadMasteryBadges(p)).toBe(6);expect(roadMasteryRank(6)).toBe('Expert driver');
    expect(parseRoadMastery(JSON.stringify(p))).toEqual(p);
    const full=parseRoadMastery('{"distance":9999999,"driftDistance":9999999,"boostSeconds":9999999}');
    expect(full).toEqual({distance:15000,driftDistance:1500,boostSeconds:10});
    expect(roadMasteryBadges(full)).toBe(9);expect(roadMasteryRank(9)).toBe('District legend');
  });
  it.each(['broken','null','[]','{"distance":-1,"driftDistance":"900","boostSeconds":null}'])('handles corrupt saves %s',raw=>{
    expect(parseRoadMastery(raw)).toEqual(createRoadMastery());
  });
});
