/** Bounded ten-Hz pose replay. Recording and playback reuse their buffers. */
export const GHOST_LIMIT_SECONDS = 600;
export const GHOST_SAMPLE_INTERVAL = 0.1;
export const GHOST_MAX_SAMPLES = 6002;
export const GHOST_STRIDE = 8;

/** Full world-space chassis pose, including pitch and roll on uneven roads. */
export interface GhostPose { x:number; y:number; z:number; qx:number; qy:number; qz:number; qw:number }
/** A clean, complete lap and its ordered checkpoint times. */
export interface LapGhostRecord { duration:number; poses:Float32Array; splits:Float32Array }
/** Mutable recorder allocated once per selected driving setup. */
export interface LapGhostRecorder {
  poses:Float32Array; splits:Float32Array; count:number; nextCheckpoint:number; invalid:boolean;
}

/** Allocate a bounded recording arena outside the frame loop. */
export function createLapGhostRecorder(checkpoints:number):LapGhostRecorder {
  if(!Number.isInteger(checkpoints)||checkpoints<3||checkpoints>64)throw new RangeError('Ghost replay requires 3–64 checkpoints.');
  return {poses:new Float32Array(GHOST_MAX_SAMPLES*GHOST_STRIDE),splits:new Float32Array(checkpoints),count:0,nextCheckpoint:1,invalid:false};
}
/** Begin a fresh lap without replacing the recorder's memory. */
export function beginLapGhost(recorder:LapGhostRecorder):void {
  recorder.count=0;recorder.nextCheckpoint=1;recorder.invalid=false;recorder.splits.fill(0);
}
/** Exclude the current recording after a reset, setup change or discontinuity. */
export function invalidateLapGhost(recorder:LapGhostRecorder):void {recorder.invalid=true;}
function validPose(p:GhostPose):boolean {
  const norm=p.qx*p.qx+p.qy*p.qy+p.qz*p.qz+p.qw*p.qw;
  return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)
    &&Math.abs(p.x)<10000&&Math.abs(p.y)<10000&&Math.abs(p.z)<10000&&norm>0.98&&norm<1.02;
}
/** Capture a pose at most ten times a second; reject jumps, gaps and overflow. */
export function appendLapGhost(recorder:LapGhostRecorder,time:number,pose:GhostPose,force=false):boolean {
  if(recorder.invalid)return false;
  if(!Number.isFinite(time)||time<0||time>GHOST_LIMIT_SECONDS||!validPose(pose)||recorder.count>=GHOST_MAX_SAMPLES){recorder.invalid=true;return false;}
  const data=recorder.poses,offset=recorder.count*GHOST_STRIDE;
  if(offset){
    const previous=offset-GHOST_STRIDE,dt=time-data[previous];
    if(dt< -0.001||dt>1){recorder.invalid=true;return false;}
    if(dt<0.0001)return false;
    if(!force&&dt<GHOST_SAMPLE_INTERVAL-0.00001)return false;
    const dx=pose.x-data[previous+1],dy=pose.y-data[previous+2],dz=pose.z-data[previous+3];
    if(dx*dx+dy*dy+dz*dz>(160*dt+8)**2){recorder.invalid=true;return false;}
  }else if(time!==0){recorder.invalid=true;return false;}
  data[offset]=time;data[offset+1]=pose.x;data[offset+2]=pose.y;data[offset+3]=pose.z;
  data[offset+4]=pose.qx;data[offset+5]=pose.qy;data[offset+6]=pose.qz;data[offset+7]=pose.qw;recorder.count++;
  return true;
}
/** Only the next checkpoint can contribute a split; the finish is index zero. */
export function recordGhostSplit(recorder:LapGhostRecorder,index:number,time:number):boolean {
  if(recorder.invalid||index!==recorder.nextCheckpoint||!Number.isFinite(time)||time<=0||time>GHOST_LIMIT_SECONDS)return false;
  const previous=index===1?0:recorder.splits[index===0?recorder.splits.length-1:index-1];
  if(time<=previous){recorder.invalid=true;return false;}
  recorder.splits[index]=time;recorder.nextCheckpoint=(index+1)%recorder.splits.length;return true;
}
/** Copy only a valid completed run. Slower runs leave the previous ghost untouched. */
export function finishLapGhost(recorder:LapGhostRecorder,duration:number):LapGhostRecord|null {
  if(recorder.invalid||recorder.count<3||duration<3||duration>GHOST_LIMIT_SECONDS
    ||recorder.splits.length<3||recorder.nextCheckpoint!==1||Math.abs(recorder.splits[0]-duration)>0.002
    ||Math.abs(recorder.poses[(recorder.count-1)*GHOST_STRIDE]-duration)>0.002)return null;
  return {duration,poses:recorder.poses.slice(0,recorder.count*GHOST_STRIDE),splits:recorder.splits.slice()};
}
/** Binary-search time, then interpolate position and shortest-hemisphere rotation. */
export function sampleLapGhost(record:LapGhostRecord,time:number,out:GhostPose):boolean {
  if(!Number.isFinite(time)||time<0||time>record.duration)return false;
  const data=record.poses,count=data.length/GHOST_STRIDE;
  let low=0,high=count-1;
  while(low+1<high){const mid=(low+high)>>>1;if(data[mid*GHOST_STRIDE]<=time)low=mid;else high=mid;}
  const a=low*GHOST_STRIDE,b=high*GHOST_STRIDE;
  const f=Math.max(0,Math.min(1,(time-data[a])/(data[b]-data[a])));
  out.x=data[a+1]+(data[b+1]-data[a+1])*f;out.y=data[a+2]+(data[b+2]-data[a+2])*f;out.z=data[a+3]+(data[b+3]-data[a+3])*f;
  const sign=data[a+4]*data[b+4]+data[a+5]*data[b+5]+data[a+6]*data[b+6]+data[a+7]*data[b+7]<0?-1:1;
  out.qx=data[a+4]+(data[b+4]*sign-data[a+4])*f;out.qy=data[a+5]+(data[b+5]*sign-data[a+5])*f;
  out.qz=data[a+6]+(data[b+6]*sign-data[a+6])*f;out.qw=data[a+7]+(data[b+7]*sign-data[a+7])*f;
  const norm=Math.hypot(out.qx,out.qy,out.qz,out.qw);out.qx/=norm;out.qy/=norm;out.qz/=norm;out.qw/=norm;return true;
}

/** Defensive decoder for browser storage; never trust saved JSON or allocate unbounded arrays. */
export function parseLapGhost(raw:string|null,checkpoints:number):LapGhostRecord|null {
  if(!raw||raw.length>700000||checkpoints<3||checkpoints>64)return null;
  try{
    const value:unknown=JSON.parse(raw);
    if(typeof value!=='object'||value===null||!('duration'in value)||!('poses'in value)||!('splits'in value))return null;
    const {duration,poses,splits}=value;
    if(typeof duration!=='number'||!Number.isFinite(duration)||duration<3||duration>GHOST_LIMIT_SECONDS
      ||!Array.isArray(poses)||poses.length<24||poses.length>GHOST_MAX_SAMPLES*GHOST_STRIDE||poses.length%GHOST_STRIDE
      ||!Array.isArray(splits)||splits.length!==checkpoints)return null;
    const recorder=createLapGhostRecorder(checkpoints),pose:GhostPose={x:0,y:0,z:0,qx:0,qy:0,qz:0,qw:1};
    for(let i=0;i<poses.length;i+=GHOST_STRIDE){
      for(let j=0;j<GHOST_STRIDE;j++)if(typeof poses[i+j]!=='number'||!Number.isFinite(poses[i+j]))return null;
      pose.x=poses[i+1];pose.y=poses[i+2];pose.z=poses[i+3];pose.qx=poses[i+4];pose.qy=poses[i+5];pose.qz=poses[i+6];pose.qw=poses[i+7];
      if(!appendLapGhost(recorder,poses[i],pose,true))return null;
    }
    for(let i=1;i<=checkpoints;i++){const index=i%checkpoints;if(typeof splits[index]!=='number'||!recordGhostSplit(recorder,index,splits[index]))return null;}
    return finishLapGhost(recorder,duration);
  }catch{return null;}
}
/** Quantize persisted coordinates without changing the in-memory replay. */
export function serializeLapGhost(record:LapGhostRecord):string {
  return JSON.stringify({duration:record.duration,poses:Array.from(record.poses,(v,i)=>{const precision=i%GHOST_STRIDE===0?1e6:1e4;return Math.round(v*precision)/precision;}),splits:Array.from(record.splits)});
}
