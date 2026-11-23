import {describe,expect,it} from 'vitest';
import {BoxGeometry,Mesh,MeshBasicMaterial,Group,Box3,Vector3} from 'three';
import {fitWheelModel,interpolateWheelSpin} from '../wheelPresentation';
describe('Wheel hub presentation',()=>{
  it('keeps an offset wheel centered through both steering directions and full spin cycles',()=>{
    const geometry=new BoxGeometry(0.025,0.075,0.075),material=new MeshBasicMaterial(),model=new Mesh(geometry,material);
    model.position.set(0.004,0.0375,-0.002);
    for(const right of [false,true]){
      const fit=fitWheelModel(model,0.35,right),steer=new Group(),spin=new Group(),clone=model.clone();
      const offset=new Group();offset.add(clone);offset.scale.setScalar(fit.scale);offset.rotation.y=right?0:Math.PI;
      offset.position.fromArray(fit.offset);spin.add(offset);steer.add(spin);
      for(const angle of [-0.56,0,0.56])for(const rotation of [0,Math.PI/2,Math.PI,6*Math.PI]){
        steer.rotation.y=angle;spin.rotation.x=rotation;
        const center=new Box3().setFromObject(steer).getCenter(new Vector3());
        expect(center.length()).toBeLessThan(0.00001);
      }
      expect(fit.width).toBeCloseTo(0.025/0.075*0.7);
    }
    geometry.dispose();material.dispose();
  });
  it('crosses the Euler boundary smoothly in either direction',()=>{
    expect(interpolateWheelSpin(3.1,-3.1,0.5)).toBeCloseTo(Math.PI);
    expect(interpolateWheelSpin(-3.1,3.1,0.5)).toBeCloseTo(-Math.PI);
    expect(interpolateWheelSpin(20,24,0.5)).toBe(22);
  });
});
