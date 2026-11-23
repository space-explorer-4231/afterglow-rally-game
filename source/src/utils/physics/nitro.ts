import {clamp} from '@/utils/math';
export const NITRO_TANK_SECONDS=5;
export const NITRO_TOTAL_SECONDS=NITRO_TANK_SECONDS*2;
export const NITRO_RECHARGE_SECONDS=12;
export const NITRO_TORQUE_MULTIPLIER=1.85;
export const NITRO_SPEED_MULTIPLIER=1.12;
export const NITRO_BOOST_ACCELERATION=7.5;
export const NITRO_CRUISE_ACCELERATION=4.5;
/** Strong launch thrust eases into cruise thrust and tapers smoothly near the speed ceiling. */
export function nitroAcceleration(speed:number,speedLimit:number):number {
  if(!Number.isFinite(speed)||!Number.isFinite(speedLimit)||speedLimit<=0)return 0;
  const forwardSpeed=Math.max(0,speed);
  return (NITRO_CRUISE_ACCELERATION+(NITRO_BOOST_ACCELERATION-NITRO_CRUISE_ACCELERATION)*clamp(1-forwardSpeed/18,0,1))
    *clamp(1-(forwardSpeed/speedLimit)**2,0,1);
}
export function createNitroState(){return {remaining:NITRO_TOTAL_SECONDS,active:false};}
export type NitroState=ReturnType<typeof createNitroState>;
export function refillNitro(state:NitroState):void {state.remaining=NITRO_TOTAL_SECONDS;state.active=false;}
/** Returns the fraction of the current physics step supplied by NOS, including the final partial step. */
export function advanceNitro(state:NitroState,requested:boolean,eligible:boolean,dt:number):number {
  state.active=false;
  if(!Number.isFinite(dt)||dt<=0)return 0;
  if(!requested){state.remaining=Math.min(NITRO_TOTAL_SECONDS,state.remaining+clamp(dt,0,1/30)*NITRO_TOTAL_SECONDS/NITRO_RECHARGE_SECONDS);return 0;}
  if(!eligible||state.remaining<=0)return 0;
  const step=clamp(dt,0,1/30),used=Math.min(step,state.remaining);
  state.remaining=Math.max(0,state.remaining-used);state.active=used>0;
  return used/step;
}

/** Ordered race gates and road sectors grant capacity, not a speed impulse. */
export function checkpointNitroFraction(index:number,total:number):number {
  return index===0||index===Math.ceil(total/2)?1:.35;
}
export function rewardNitro(state:NitroState,fraction:number):void {
  if(Number.isFinite(fraction)&&fraction>0)state.remaining=Math.min(NITRO_TOTAL_SECONDS,state.remaining+NITRO_TOTAL_SECONDS*Math.min(1,fraction));
}
