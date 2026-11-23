import {Vector3} from 'three';

/** Fit every box corner to 80% of the perspective view instead of fitting its longest world axis. */
export function previewCameraDistance(size:Vector3,direction:Vector3,cameraUp:Vector3,fov:number,aspect:number):number {
  const right=new Vector3().crossVectors(cameraUp,direction).normalize();
  const up=new Vector3().crossVectors(direction,right).normalize();
  const vertical=Math.tan(fov*Math.PI/360)*0.8;
  const horizontal=vertical*Math.max(0.1,aspect);
  let distance=1;
  for(let corner=0;corner<8;corner++){
    const x=(corner&1?1:-1)*size.x/2;
    const y=(corner&2?1:-1)*size.y/2;
    const z=(corner&4?1:-1)*size.z/2;
    const depth=x*direction.x+y*direction.y+z*direction.z;
    distance=Math.max(distance,Math.abs(x*right.x+y*right.y+z*right.z)/horizontal+depth,Math.abs(x*up.x+y*up.y+z*up.z)/vertical+depth);
  }
  return distance;
}
