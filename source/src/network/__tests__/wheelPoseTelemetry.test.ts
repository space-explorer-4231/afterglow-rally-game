import {describe,expect,it} from 'vitest';
import {Vector3,Quaternion} from 'three';
import {validateEntitySnapshot} from '../packetValidator';
import {SnapshotRingBuffer} from '../snapshotRingBuffer';
import {validateTelemetryPayload as validateServer} from '../../../server/src/packetValidator';
const packet={seq:1,time:1000,pos:[0,9,0],rot:[0,0,0,1],linVel:[0,0,0],angVel:[0,0,0],steer:0.2,wheelRots:[3.1,3.1,0,0],wheelY:[-0.4,-0.45,-0.38,-0.44],rpm:3500,gear:2,isDrifting:true,surface:'tarmac'};
describe('Actual wheel suspension network poses',()=>{
  it('rejects invalid hub coordinates at both ends of the relay',()=>{
    for(const wheelY of [[-4,0,0,0],[NaN,0,0,0],[0,0,0],'wrong']){
      expect(validateEntitySnapshot({...packet,wheelY})).toBeNull();
      expect(validateServer({...packet,wheelY})).toBeNull();
    }
    expect(validateServer(packet)?.wheelY).toEqual(packet.wheelY);
  });
  it('interpolates four independent hubs and smooths wrapped spins without changing chassis position',()=>{
    const first=validateEntitySnapshot(packet),second=validateEntitySnapshot({...packet,time:1100,wheelY:[-0.5,-0.35,-0.48,-0.34],wheelRots:[-3.1,-3.1,1,1]});
    if(!first||!second)throw Error('Valid wheel pose rejected');
    const ring=new SnapshotRingBuffer();ring.push(first);ring.push(second);
    const position=new Vector3(),rotation=new Quaternion(),sample=ring.sample(1050,position,rotation);
    expect(sample?.hasWheelPose).toBe(true);expect(sample?.wheelY[0]).toBeCloseTo(-0.45);expect(sample?.wheelY[1]).toBeCloseTo(-0.4);
    expect(sample?.wheelRots[0]).toBeCloseTo(Math.PI);expect(position.y).toBe(9);
    expect(ring.sample(1120,position,rotation)?.wheelY[0]).toBe(-0.5);
  });
  it('keeps the compatibility fallback when no hub pose is supplied',()=>{
    const old=validateEntitySnapshot({...packet,wheelY:undefined});if(!old)throw Error('Legacy packet rejected');
    const ring=new SnapshotRingBuffer();ring.push(old);
    expect(ring.sample(1000,new Vector3(),new Quaternion())?.hasWheelPose).toBe(false);
  });
});
