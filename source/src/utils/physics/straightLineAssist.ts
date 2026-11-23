import {clamp} from '@/utils/math';
const DEAD_ZONE=Math.PI/180;
const FADE_ANGLE=4*Math.PI/180;
/** Full road stability within one degree; smoothly hands control back by four degrees. */
export function straightLineAssistBlend(steerAngle:number,slipAngle:number,handbrake:boolean):number {
  if(handbrake||!Number.isFinite(steerAngle)||!Number.isFinite(slipAngle))return 0;
  return clamp((FADE_ANGLE-Math.abs(steerAngle))/(FADE_ANGLE-DEAD_ZONE),0,1)
    *clamp((FADE_ANGLE-Math.abs(slipAngle))/(FADE_ANGLE-DEAD_ZONE),0,1);
}
