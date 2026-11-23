export const DRIFT_HEAT_SECONDS = 90;
export interface DriftHeat { phase:'ready'|'running'|'finished'; elapsed:number; banked:number; chain:number; multiplier:number; driftTime:number; quietTime:number; airborneTime:number; transitions:number; lastSide:number; lastLinkTime:number; message:string }
export interface DriftSample { speed:number; angle:number; airborne:boolean; rollover:boolean; reset:boolean; burnout:boolean; dt:number }
export function createDriftHeat(running=false): DriftHeat {return {phase:running?'running':'ready',elapsed:0,banked:0,chain:0,multiplier:1,driftTime:0,quietTime:0,airborneTime:0,transitions:0,lastSide:0,lastLinkTime:0,message:'90 seconds · slide, link, straighten to bank'};}
function dropChain(s:DriftHeat,message:string):void {s.chain=0;s.multiplier=1;s.driftTime=0;s.quietTime=0;s.lastSide=0;s.message=message;}
/** Called at 10 Hz with elapsed active-play time. Mutates owned state without tick allocations. */
export function advanceDriftHeat(s:DriftHeat,p:DriftSample):void {
  if(s.phase!=='running'||!Number.isFinite(p.dt)||p.dt<=0)return;
  const dt=Math.min(.25,p.dt,DRIFT_HEAT_SECONDS-s.elapsed);s.elapsed+=dt;
  const degrees=Math.abs(p.angle)*180/Math.PI;s.airborneTime=p.airborne?s.airborneTime+dt:0;
  if(p.reset||p.rollover||s.airborneTime>1||degrees>78||!Number.isFinite(p.speed)||!Number.isFinite(p.angle))dropChain(s,p.reset?'Reset · unbanked chain lost':degrees>78?'Spin · unbanked chain lost':'Recover · unbanked chain lost');
  else if(!p.airborne&&!p.burnout&&p.speed>=30&&p.speed<=220&&degrees>=12&&degrees<=65){
    const side=Math.sign(p.angle);
    if(s.lastSide&&side!==s.lastSide&&s.driftTime>.8&&s.elapsed-s.lastLinkTime>=.8){s.transitions++;s.lastLinkTime=s.elapsed;s.chain+=100;s.message='LINK +100 · keep the slide controlled';}else s.message='DRIFT · straighten for 1.5s to bank';
    s.lastSide=side;s.quietTime=0;s.driftTime+=dt;s.multiplier=Math.min(5,1+Math.floor(s.driftTime/3));
    s.chain+=dt*Math.min(p.speed,140)*Math.min(degrees,50)/25*s.multiplier;
  }else if(s.chain>0&&!p.airborne){s.quietTime=degrees<12&&!p.burnout?s.quietTime+dt:0;if(s.quietTime>=1.5){s.banked=Math.min(1e8,s.banked+Math.floor(s.chain));dropChain(s,'BANKED · link the next corner');}}
  if(s.elapsed>=DRIFT_HEAT_SECONDS){s.phase='finished';dropChain(s,'Heat complete · only banked points count');}
}
export function driftMedal(score:number):string {return score>=10000?'PLATINUM':score>=6000?'GOLD':score>=3000?'SILVER':score>=1000?'BRONZE':'KEEP PRACTICING';}
