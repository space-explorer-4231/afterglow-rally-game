import { describe, expect, it } from 'vitest';
import { createCourseRibbon } from '../courseRibbon';
import { compileTerrain } from '../terrainCompiler';
import { LEVEL5_GYMKHANA_DATA } from '@/config/levels/gymkhanaIsland';
describe('district road conforms to physics terrain',()=>{
  it('keeps closed boundaries finite and above the driveable surface',()=>{
    const terrain=compileTerrain(LEVEL5_GYMKHANA_DATA);
    const geometry=createCourseRibbon(LEVEL5_GYMKHANA_DATA,terrain,10,0.18,240);
    const positions=geometry.getAttribute('position');
    expect(positions.count).toBe(482);
    for(let i=0;i<positions.count;i++){
      expect(Number.isFinite(positions.getX(i))).toBe(true);
      expect(positions.getY(i)).toBeCloseTo(8.032,2);
    }
    expect(positions.getX(0)).toBeCloseTo(positions.getX(480));
    expect(positions.getZ(0)).toBeCloseTo(positions.getZ(480));
    geometry.dispose();
  });
  it('keeps road paint physically separated from the asphalt ribbon',()=>{
    const terrain=compileTerrain(LEVEL5_GYMKHANA_DATA);
    const asphalt=createCourseRibbon(LEVEL5_GYMKHANA_DATA,terrain,0,14,240);
    const paint=createCourseRibbon(LEVEL5_GYMKHANA_DATA,terrain,0.2,0.12,240,true,0.085);
    const roadPositions=asphalt.getAttribute('position');
    const paintPositions=paint.getAttribute('position');
    for(let i=0;i<paintPositions.count;i++){
      expect(paintPositions.getY(i)-roadPositions.getY(i)).toBeGreaterThan(0.05);
    }
    asphalt.dispose();paint.dispose();
  });
});
