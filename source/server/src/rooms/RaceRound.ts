import type {RaceRoundState,RaceStanding} from '../types.js';

interface Driver extends RaceStanding {x:number;z:number;lastAt:number|null;finishOrder:number}
/** Server-owned one-lap progress, finish times, bounded finish grace and disconnect outcomes. */
export class RaceRound {
  private readonly drivers=new Map<string,Driver>();
  private phase:RaceRoundState['phase']='racing';
  private deadlineAt:number;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private finishCount=0;
  constructor(private readonly round:number,private readonly startAt:number,
    private readonly course:{radius:number;points:readonly (readonly [number,number])[]},
    racers:readonly {id:string;nickname:string;vehicleId:string}[],private readonly changed:()=>void){
    this.deadlineAt=startAt+600000;
    for(const racer of racers)this.drivers.set(racer.id,{...racer,status:'racing',reason:null,finishMs:null,completedCheckpoints:0,x:0,z:0,lastAt:null,finishOrder:0});
    this.schedule();
  }
  /** The authenticated telemetry stream advances only the next real course gate. */
  position(id:string,x:number,z:number):void {
    const driver=this.drivers.get(id),now=Date.now();
    if(!driver||driver.status!=='racing'||this.phase!=='racing'||!Number.isFinite(x)||!Number.isFinite(z))return;
    if(now>=this.deadlineAt){this.finish();return;}
    if(now>=this.startAt&&driver.lastAt!==null){
      const dt=Math.max(0,(now-driver.lastAt)/1000),dx=x-driver.x,dz=z-driver.z;
      if(dx*dx+dz*dz>(160*dt+12)**2){this.drop(id,'teleport');return;}
    }
    driver.x=x;driver.z=z;driver.lastAt=now;
    if(now<this.startAt)return;
    const next=(driver.completedCheckpoints+1)%this.course.points.length,point=this.course.points[next];
    const dx=x-point[0],dz=z-point[1];
    if(dx*dx+dz*dz>this.course.radius*this.course.radius)return;
    driver.completedCheckpoints++;
    if(driver.completedCheckpoints===this.course.points.length){
      driver.status='finished';driver.finishMs=Math.max(0,now-this.startAt);
      driver.finishOrder=++this.finishCount;
      this.deadlineAt=Math.min(this.deadlineAt,now+30000);this.schedule();
    }
    if(this.everyoneDone())this.finish();else this.changed();
  }
  /** Departures remain visible in the results instead of silently changing the finishing order. */
  leave(id:string):void {this.drop(id,'left');}
  /** Snapshot allocation happens only at checkpoint/lifecycle changes, never every telemetry frame. */
  snapshot():RaceRoundState {
    const standings=Array.from(this.drivers.values(),driver=>({id:driver.id,nickname:driver.nickname,vehicleId:driver.vehicleId,status:driver.status,reason:driver.reason,finishMs:driver.finishMs,completedCheckpoints:driver.completedCheckpoints}));
    standings.sort((a,b)=>a.finishMs!==null?(b.finishMs!==null?a.finishMs-b.finishMs||(this.drivers.get(a.id)?.finishOrder??0)-(this.drivers.get(b.id)?.finishOrder??0):-1):b.finishMs!==null?1:b.completedCheckpoints-a.completedCheckpoints);
    return {round:this.round,startAt:this.startAt,deadlineAt:this.deadlineAt,phase:this.phase,totalCheckpoints:this.course.points.length,standings};
  }
  /** Cancel all timers when a round is reset, its room closes or the service stops. */
  destroy():void {if(this.timer)clearTimeout(this.timer);this.timer=null;}
  private drop(id:string,reason:'left'|'teleport'):void {
    const driver=this.drivers.get(id);if(!driver||driver.status!=='racing'||this.phase!=='racing')return;
    driver.status='dnf';driver.reason=reason;
    if(this.everyoneDone())this.finish();else this.changed();
  }
  private everyoneDone():boolean {for(const driver of this.drivers.values())if(driver.status==='racing')return false;return true;}
  private finish():void {
    if(this.phase==='results')return;
    this.destroy();this.phase='results';
    for(const driver of this.drivers.values())if(driver.status==='racing'){driver.status='dnf';driver.reason='timeout';}
    this.changed();
  }
  private schedule():void {this.destroy();this.timer=setTimeout(()=>this.finish(),Math.max(0,this.deadlineAt-Date.now()));}
}
