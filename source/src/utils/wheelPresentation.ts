import {Box3, Vector3, type Object3D} from 'three';

/** Fit a model about its measured hub, so spinning/steering cannot orbit an offset origin. */
export function fitWheelModel(model: Object3D, radius: number, isRightSide: boolean): {scale:number;offset:[number,number,number];width:number} {
  const bounds=new Box3().setFromObject(model), center=bounds.getCenter(new Vector3()), size=bounds.getSize(new Vector3());
  const measuredRadius=Math.max(size.y,size.z)/2;
  const scale=Number.isFinite(measuredRadius) && measuredRadius>0.00001 ? radius/measuredRadius : 1;
  const side=isRightSide?1:-1;
  return {scale,offset:[-center.x*scale*side,-center.y*scale,-center.z*scale*side],width:size.x*scale};
}

/** Avoid the Euler wrap jump for current-angle packets; preserve legacy cumulative-angle streams. */
export function interpolateWheelSpin(from:number,to:number,t:number):number {
  const delta=Math.abs(from)<=Math.PI+0.001 && Math.abs(to)<=Math.PI+0.001
    ? Math.atan2(Math.sin(to-from),Math.cos(to-from)) : to-from;
  return from+delta*t;
}
