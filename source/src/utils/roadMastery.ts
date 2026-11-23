/** Untimed, device-local achievements for each car and district. */
export interface RoadMasteryProgress { distance:number; driftDistance:number; boostSeconds:number }
/** A physical position anchor prevents spawn changes from earning distance. */
export interface RoadMasteryTracker { anchored:boolean; x:number; z:number }
export interface RoadMasterySample { x:number; z:number; speed:number; angle:number; dt:number; grounded:boolean; forward:boolean; nitro:boolean; reset:boolean }
export const ROAD_MASTERY_GOALS = [
  {key:'distance',title:'Explorer',unit:'m',targets:[1000,5000,15000]},
  {key:'driftDistance',title:'Corner artist',unit:'m',targets:[100,500,1500]},
  {key:'boostSeconds',title:'Boost pilot',unit:'s',targets:[2,5,10]},
] as const;
/** Empty progress; no locked vehicles or gameplay advantages. */
export function createRoadMastery():RoadMasteryProgress {return {distance:0,driftDistance:0,boostSeconds:0};}
/** Scratch tracker allocated once per profile. */
export function createRoadMasteryTracker():RoadMasteryTracker {return {anchored:false,x:0,z:0};}
/** Parse optional saved progress without trusting browser storage. */
export function parseRoadMastery(raw:string|null):RoadMasteryProgress {
  const result=createRoadMastery();
  try {
    const value:unknown=JSON.parse(raw??'null');
    if(typeof value!=='object'||value===null)return result;
    for(const goal of ROAD_MASTERY_GOALS){
      const amount=Reflect.get(value,goal.key);
      if(typeof amount==='number'&&Number.isFinite(amount)&&amount>=0)result[goal.key]=Math.min(amount,goal.targets[2]);
    }
  }catch{/* Storage may be unavailable or contain an older format. */}
  return result;
}
/** Mutate owned progress without allocations. Pauses, teleports and reversals earn nothing. */
export function advanceRoadMastery(p:RoadMasteryProgress,t:RoadMasteryTracker,s:RoadMasterySample):void {
  if(!Number.isFinite(s.x)||!Number.isFinite(s.z)){t.anchored=false;return;}
  const distance=Math.hypot(s.x-t.x,s.z-t.z),wasAnchored=t.anchored;
  t.x=s.x;t.z=s.z;t.anchored=true;
  if(!wasAnchored||s.reset||!Number.isFinite(s.dt)||s.dt<=0||s.dt>.5||!Number.isFinite(s.speed)||!Number.isFinite(s.angle)||!s.grounded||!s.forward||s.speed<8||s.speed>450)return;
  if(distance>Math.max(2,s.speed/3.6*s.dt*1.8))return;
  const travelled=Math.min(distance,s.speed/3.6*s.dt*1.1);
  p.distance=Math.min(15000,p.distance+travelled);
  const angle=Math.abs(s.angle);
  if(s.speed>=30&&s.speed<=220&&angle>=12*Math.PI/180&&angle<=65*Math.PI/180)p.driftDistance=Math.min(1500,p.driftDistance+travelled);
  if(s.nitro&&travelled>.05)p.boostSeconds=Math.min(10,p.boostSeconds+s.dt);
}
/** Count bronze, silver and gold badges across three disciplines. */
export function roadMasteryBadges(p:RoadMasteryProgress):number {
  let badges=0;for(const goal of ROAD_MASTERY_GOALS)for(const target of goal.targets)if(p[goal.key]>=target)badges++;
  return badges;
}
/** Rank follows earned badges. */
export function roadMasteryRank(badges:number):string {return badges>=9?'District legend':badges>=6?'Expert driver':badges>=3?'Road regular':'New arrival';}
