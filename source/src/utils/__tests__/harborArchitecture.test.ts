import {describe,it,expect} from 'vitest';
import {CatmullRomCurve3,Vector3} from 'three';
import {HARBOR_BUILDINGS} from '@/config/harborScenery';
import {HARBOR_RING_DATA} from '@/config/levels/harborRing';
import {buildHarborArchitecture} from '../harborArchitecture';
import {createCoastalPlacements,coastalViewDistance,COASTAL_ASSETS} from '@/config/coastalAssets';

const course=new CatmullRomCurve3(HARBOR_RING_DATA.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5).getPoints(2000);
describe('Coastal district geometry and budgets',()=>{
  it('keeps every architectural surface outside the continuous course and launch grid',()=>{
    const parts=buildHarborArchitecture(HARBOR_BUILDINGS.map(()=>8));
    expect(parts.length).toBeGreaterThan(3000);
    for(const part of parts){
      expect([part.x,part.y,part.z,part.w,part.h,part.d].every(Number.isFinite)).toBe(true);
      expect(Math.min(part.w,part.h,part.d)).toBeGreaterThan(0);
      if(part.finish==='paint'||part.finish==='asphalt')continue;
      const gap=Math.min(...course.map(p=>Math.hypot(Math.max(0,Math.abs(p.x-part.x)-part.w/2),Math.max(0,Math.abs(p.z-part.z)-part.d/2))));
      expect(gap,JSON.stringify(part)).toBeGreaterThan(HARBOR_RING_DATA.track.width/2+2);
    }
  });
  it('keeps photographed props clear and never scatters millions of unbounded instances',()=>{
    const placements=createCoastalPlacements();
    expect(placements.length).toBeLessThan(90);
    for(const p of placements){
      expect(COASTAL_ASSETS).toContain(p.asset);
      expect([p.x,p.y,p.z,p.yaw,p.scale].every(Number.isFinite)).toBe(true);
      const gap=Math.min(...course.map(v=>Math.hypot(v.x-p.x,v.z-p.z)))-p.radius;
      expect(gap,JSON.stringify(p)).toBeGreaterThan(HARBOR_RING_DATA.track.width/2+4);
    }
  });
  it('rejects invalid height samples and bounds mobile near-field triangle cost',()=>{
    expect(()=>buildHarborArchitecture([])).toThrow();
    expect(()=>buildHarborArchitecture(HARBOR_BUILDINGS.map(()=>NaN))).toThrow();
    expect(coastalViewDistance('very_high',true,'island_tree_02')).toBeLessThan(coastalViewDistance('medium',false,'island_tree_02'));
    expect(coastalViewDistance('medium',false,'island_tree_02')).toBeLessThan(coastalViewDistance('medium',false,'street_lamp_01'));
  });
});
