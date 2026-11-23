import {CatmullRomCurve3,Vector3} from 'three';
import type {LevelData} from '@/types/level';
import {HARBOR_BUILDINGS} from '@/config/harborScenery';

/** Shared, deterministic roadside landmarks; never placed in the driving corridor. */
export interface FestivalStop {id:number;x:number;z:number;roadX:number;roadZ:number;yaw:number;name:string}
export const FESTIVAL_STOP_COUNT=3;

/** Build the same trail for every client without random or network-owned NPC state. */
export function planFestivalRoute(level:LevelData):FestivalStop[]{
  const curve=new CatmullRomCurve3(level.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5);
  const route=curve.getSpacedPoints(384),stops:FestivalStop[]=[];
  const margin=level.track.width/2+14;
  for(let slot=0;slot<FESTIVAL_STOP_COUNT;slot++){
    let found=false;
    for(let attempt=0;attempt<30&&!found;attempt++){
      const index=(Math.floor((slot+.35)*384/3)+attempt*3)%384;
      const p=route[index],next=route[(index+1)%384];
      const length=Math.hypot(next.x-p.x,next.z-p.z);if(length<.01)continue;
      for(const side of [1,-1]){
        const x=p.x+(next.z-p.z)/length*margin*side,z=p.z-(next.x-p.x)/length*margin*side;
        if(Math.abs(x)>level.terrainBase.width/2-15||Math.abs(z)>level.terrainBase.depth/2-15)continue;
        if(route.some(q=>Math.hypot(x-q.x,z-q.z)<margin-1))continue;
        if(stops.some(q=>Math.hypot(x-q.x,z-q.z)<35))continue;
        if(level.props.some(q=>Math.hypot(x-q.position[0],z-q.position[2])<15))continue;
        if(level.id==='level6_gymkhana_harbor'&&HARBOR_BUILDINGS.some(b=>Math.abs(x-b.x)<b.width/2+10&&Math.abs(z-b.z)<b.depth/2+10))continue;
        stops.push({id:slot,x,z,roadX:p.x,roadZ:p.z,yaw:Math.atan2(p.x-x,p.z-z),name:['SUNRISE DECK','SKY GARDEN','HORIZON CLUB'][slot]});found=true;break;
      }
    }
  }
  return stops;
}

/** Local sightseeing is separate from authoritative Cup scoring and never awards NOS. */
export function visitFestivalStops(stops:readonly FestivalStop[],mask:number,x:number,z:number):number{
  if(!Number.isFinite(x)||!Number.isFinite(z))return mask;
  for(const stop of stops)if(Math.hypot(x-stop.roadX,z-stop.roadZ)<18)mask|=1<<stop.id;
  return mask;
}
