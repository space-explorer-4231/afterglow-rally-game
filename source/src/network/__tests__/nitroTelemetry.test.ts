import {expect,it} from 'vitest';
import {Vector3,Quaternion} from 'three';
import {validateEntitySnapshot,validateTelemetryPayload} from '../packetValidator';
import {parseClientMessage} from '../../../server/src/packetValidator';
import {SnapshotRingBuffer} from '../snapshotRingBuffer';
const packet={seq:1,time:1000,pos:[0,9,0],rot:[0,0,0,1],linVel:[0,0,25],angVel:[0,0,0],steer:0,wheelRots:[1,1,1,1],rpm:4500,gear:3,isDrifting:false,surface:'tarmac',nitroActive:true};
it('validates and relays a strict boolean NOS flag, including release',()=>{
  expect(validateTelemetryPayload(packet)?.nitroActive).toBe(true);
  expect(parseClientMessage({type:'telemetry',payload:packet})).toMatchObject({payload:{nitroActive:true}});
  expect(parseClientMessage({type:'telemetry',payload:{...packet,nitroActive:'yes'}})).toBeNull();
  expect(validateEntitySnapshot({...packet,nitroActive:1})).toBeNull();
  const buffer=new SnapshotRingBuffer(),a=validateEntitySnapshot(packet),b=validateEntitySnapshot({...packet,time:1033,nitroActive:false});
  if(!a||!b)throw Error('Valid NOS snapshots rejected');buffer.push(a);buffer.push(b);
  const p=new Vector3(),q=new Quaternion();expect(buffer.sample(1000,p,q)?.nitroActive).toBe(true);expect(buffer.sample(1080,p,q)?.nitroActive).toBe(false);
});
