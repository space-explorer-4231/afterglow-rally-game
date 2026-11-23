import type { RapierRigidBody } from '@react-three/rapier';
import { Quaternion, Vector3 } from 'three';
import { ROAD_HANDLING } from '@/config/physicsBalance';
import { getDriftAccelerationLimit } from './driftTraction';
const rotation=new Quaternion(),inverse=new Quaternion(),localVelocity=new Vector3(),impulse=new Vector3();

/** Bounded lateral tire-force assistance; preserves vertical motion and collision impulses. */
export function applyDriftMomentum(body: RapierRigidBody, steering:number, dt:number, groundedRatio=1):void{
  if(!Number.isFinite(steering) || !Number.isFinite(dt) || dt<=0)return;
  const q=body.rotation(),v=body.linvel();rotation.set(q.x,q.y,q.z,q.w);
  inverse.copy(rotation).invert();localVelocity.set(v.x,v.y,v.z).applyQuaternion(inverse);
  if(localVelocity.z<3)return;
  const target=-localVelocity.z*Math.tan(steering*ROAD_HANDLING.driftTargetSlip);
  const limit=getDriftAccelerationLimit(groundedRatio);
  if(limit<=0)return;
  const acceleration=Math.max(-limit,Math.min(limit,(target-localVelocity.x)*ROAD_HANDLING.driftLateralResponse));
  impulse.set(acceleration*body.mass()*Math.min(0.05,Math.max(0,dt)),0,0).applyQuaternion(rotation);
  impulse.y=0;
  if(!Number.isFinite(impulse.x)||!Number.isFinite(impulse.z))return;
  body.applyImpulse(impulse,true);
}
