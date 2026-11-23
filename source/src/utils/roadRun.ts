/** Fixed four-quarter challenge capacity, shared with startup diagnostics. */
export const ROAD_RUN_SECTORS=4;
/** Owned state for the four-quarter driving challenge; it never changes race scores. */
export interface RoadRunState {
  active:boolean; anchored:boolean; previous:number; x:number; z:number; elapsed:number;
  onRoad:number; total:number; quarter:number; splits:number[]; lastTime:number|null;
  lastAccuracy:number|null; best:number|null; invalid:boolean;
}
/** Projected route observation. Speed is km/h, time is seconds, progress wraps at one. */
export interface RoadRunSample {progress:number;distance:number;x:number;z:number;speed:number;dt:number;eligible:boolean;reset:boolean}
/** Reusable tracker; split slots are allocated only once. */
export function createRoadRun(best:number|null=null):RoadRunState {
  return {active:false,anchored:false,previous:0,x:0,z:0,elapsed:0,onRoad:0,total:0,quarter:0,splits:[0,0,0,0],lastTime:null,lastAccuracy:null,best,invalid:false};
}
/** Pause/recovery discards the partial run rather than granting an impossible record. */
export function interruptRoadRun(run:RoadRunState):void {run.active=false;run.anchored=false;run.invalid=true;}
/** Advance with bounded samples. Only a complete ordered forward loop can record a best. */
export function advanceRoadRun(r:RoadRunState,s:RoadRunSample,roadHalfWidth:number):void {
  if(!Number.isFinite(s.progress)||!Number.isFinite(s.distance)||!Number.isFinite(s.x)||!Number.isFinite(s.z)||!Number.isFinite(s.speed)||!Number.isFinite(s.dt)||s.dt<=0||s.dt>.5||s.progress<0||s.progress>=1||!s.eligible||s.reset){interruptRoadRun(r);return;}
  const previous=r.previous,wasAnchored=r.anchored,travel=Math.hypot(s.x-r.x,s.z-r.z);
  r.previous=s.progress;r.x=s.x;r.z=s.z;r.anchored=true;
  if(!wasAnchored)return;
  let step=s.progress-previous;if(step<-.5)step+=1;else if(step>.5)step-=1;
  if(travel>Math.max(6,s.speed/3.6*s.dt*1.8)||step>.08||step<-.004){interruptRoadRun(r);return;}
  const crossing=previous>.94&&s.progress<.06&&step>0;
  if(!r.active){
    if((crossing||(previous<.025&&s.progress<.04&&step>.0001))&&s.speed>=12&&s.distance<=roadHalfWidth){
      r.active=true;r.invalid=false;r.elapsed=0;r.total=0;r.onRoad=0;r.quarter=0;r.splits.fill(0);
    }
    return;
  }
  const before=r.elapsed;r.elapsed+=s.dt;r.total+=s.dt;
  if(s.distance<=Math.max(1,roadHalfWidth-.8))r.onRoad+=s.dt;
  // Boundaries are the actual four quarters of the closed spline, not distance driven off course.
  const boundary=(r.quarter+1)/4;
  const previousUnwrapped=previous,nowUnwrapped=s.progress+(crossing?1:0);
  if(step>0&&previousUnwrapped<boundary&&nowUnwrapped>=boundary){
    const fraction=Math.max(0,Math.min(1,(boundary-previousUnwrapped)/step));
    r.splits[r.quarter]=before+s.dt*fraction;r.quarter++;
  }
  if(crossing){
    if(r.quarter===4&&r.elapsed>=8&&r.elapsed<=1800){
      r.lastTime=r.splits[3];r.lastAccuracy=r.total>0?r.onRoad/r.total*100:0;
      if(r.lastAccuracy>=90&&(r.best===null||r.lastTime<r.best))r.best=r.lastTime;
    }
    r.active=false;r.anchored=false;
  }
}
/** Optional local record is finite and plausible; corrupt storage cannot become a record. */
export function parseRoadRunBest(raw:string|null):number|null {const n=Number(raw);return raw!==null&&Number.isFinite(n)&&n>=8&&n<=1800?n:null;}
