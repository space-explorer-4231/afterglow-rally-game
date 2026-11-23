import {clamp} from '@/utils/math';

/** Catch impending over-rotation beyond a generous drift window. Torque only: no pose/velocity snap. */
export function spinCatchImpulse(slip:number,yaw:number,speed:number,inertia:number,dt:number):number {
  if(speed<4||dt<=0||!Number.isFinite(slip+yaw+speed+inertia+dt))return 0;
  const predicted=slip-yaw*.18;
  const risk=clamp((Math.max(Math.abs(slip),Math.abs(predicted))-.52)/.45,0,1);
  if(!risk)return 0;
  const target=clamp(slip*3,-1.5,1.5);
  return (target-yaw)*inertia*(1-Math.exp(-12*risk*Math.min(dt,1/30)));
}
