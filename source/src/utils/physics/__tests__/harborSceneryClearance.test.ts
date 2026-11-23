import {describe,expect,it} from 'vitest';
import {CatmullRomCurve3,Vector3} from 'three';
import {HARBOR_BUILDINGS,HARBOR_GARDENS} from '@/config/harborScenery';
import {HARBOR_RING_DATA,LEVEL_PRESET_HARBOR} from '@/config/levels/harborRing';
import {validateLevelPreset} from '@/utils/validation';

describe('Harbor street map',()=>{
  it('keeps buildings, sidewalks and planted boulevards clear of the complete road',()=>{
    const curve=new CatmullRomCurve3(HARBOR_RING_DATA.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',0.5);
    const samples=curve.getPoints(1600);
    for(const b of HARBOR_BUILDINGS){
      const radius=Math.hypot((b.width+9)/2,(b.depth+9)/2);
      const gap=Math.min(...samples.map(p=>Math.hypot(p.x-b.x,p.z-b.z)))-radius;
      expect(gap).toBeGreaterThan(HARBOR_RING_DATA.track.width/2+4);
    }
    for(const [x,z,w,d] of HARBOR_GARDENS){
      for(const p of samples){
        const dx=Math.max(0,Math.abs(p.x-x)-(w+1)/2),dz=Math.max(0,Math.abs(p.z-z)-(d+1)/2);
        expect(Math.hypot(dx,dz)).toBeGreaterThan(HARBOR_RING_DATA.track.width/2+4);
      }
    }
  });
  it('validates the sixth map and exposes untimed driving with asphalt tires',()=>{
    expect(validateLevelPreset(LEVEL_PRESET_HARBOR).valid).toBe(true);
    expect(LEVEL_PRESET_HARBOR.supportedModes).toContain('freeroam');
    expect(LEVEL_PRESET_HARBOR.recommendedTire).toBe('asphalt');
  });
});
