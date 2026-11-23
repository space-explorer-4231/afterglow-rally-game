import { describe, expect, it } from 'vitest';
import { CatmullRomCurve3, Vector3 } from 'three';
import { ARENA_DEPOTS, DEPOT_HALF_WIDTH, DEPOT_HALF_DEPTH } from '@/config/arenaScenery';
import { LEVEL5_TRACK_POINTS, LEVEL5_GYMKHANA_DATA } from '@/config/levels/gymkhanaIsland';

describe('Industrial scenery driving clearance',()=>{
  it('leaves the full drift circuit, spawn and jump ramps unobstructed',()=>{
    const curve=new CatmullRomCurve3(LEVEL5_TRACK_POINTS.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',0.5);
    const samples=curve.getPoints(1200);
    const footprint=Math.hypot(DEPOT_HALF_WIDTH,DEPOT_HALF_DEPTH);
    for(const [x,z] of ARENA_DEPOTS){
      const nearest=Math.min(...samples.map(p=>Math.hypot(p.x-x,p.z-z)));
      expect(nearest-footprint,`Depot ${x},${z} drift circuit`).toBeGreaterThan(LEVEL5_GYMKHANA_DATA.track.width/2+4);
      expect(Math.hypot(x,z)-footprint,'Launch-grid clearance').toBeGreaterThan(25);
      for(const ramp of LEVEL5_GYMKHANA_DATA.props.filter(p=>p.type==='jump_ramp')){
        expect(Math.hypot(x-ramp.position[0],z-ramp.position[2])-footprint,'Stunt ramp clearance').toBeGreaterThan(15);
      }
    }
  });
});
