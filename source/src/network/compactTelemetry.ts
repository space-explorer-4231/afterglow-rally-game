import type {VehicleTelemetryPayload} from '@/types/network';

/** Bound JSON precision at the send boundary; millimetre poses retain visual fidelity. */
export function compactTelemetry(payload:Omit<VehicleTelemetryPayload,'seq'|'time'>):void {
  for(let i=0;i<3;i++){
    payload.pos[i]=Math.round(payload.pos[i]*1000)/1000;
    payload.linVel[i]=Math.round(payload.linVel[i]*100)/100;
    payload.angVel[i]=Math.round(payload.angVel[i]*1000)/1000;
  }
  for(let i=0;i<4;i++){
    payload.rot[i]=Math.round(payload.rot[i]*10000)/10000;
    payload.wheelRots[i]=Math.round(payload.wheelRots[i]*1000)/1000;
    if(payload.wheelY)payload.wheelY[i]=Math.round(payload.wheelY[i]*1000)/1000;
  }
  payload.steer=Math.round(payload.steer*1000)/1000;payload.rpm=Math.round(payload.rpm);
}
