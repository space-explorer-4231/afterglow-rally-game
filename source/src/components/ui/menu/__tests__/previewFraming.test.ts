import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {previewCameraDistance} from '../previewFraming';

it.each([
  {name:'wide sports coupe',size:new Vector3(2,1.4,4.7)},
  {name:'tall delivery van',size:new Vector3(2.2,3,5)},
  {name:'short rally hatchback',size:new Vector3(1.9,1.6,3.8)},
])('frames every corner of $name inside the viewer across portrait and landscape',({size})=>{
  const direction=new Vector3(3.8,2,-5.4).normalize(),worldUp=new Vector3(0,1,0);
  const right=new Vector3().crossVectors(worldUp,direction).normalize(),up=new Vector3().crossVectors(direction,right).normalize();
  const fov=42,tangent=Math.tan(fov*Math.PI/360);
  for(const aspect of [.7,1.4,3.5]){
    const distance=previewCameraDistance(size,direction,worldUp,fov,aspect);
    let greatestOccupancy=0;
    for(let corner=0;corner<8;corner++){
      const offset=new Vector3((corner&1?1:-1)*size.x/2,(corner&2?1:-1)*size.y/2,(corner&4?1:-1)*size.z/2);
      const depth=distance-offset.dot(direction);
      expect(depth).toBeGreaterThan(0);
      const occupancy=Math.max(Math.abs(offset.dot(right))/(depth*tangent*aspect),Math.abs(offset.dot(up))/(depth*tangent));
      expect(occupancy).toBeLessThanOrEqual(.800001);
      greatestOccupancy=Math.max(greatestOccupancy,occupancy);
    }
    expect(greatestOccupancy).toBeCloseTo(.8,5);
  }
});
