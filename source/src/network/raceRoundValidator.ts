import type {RaceRoundState,RaceStanding} from '@/types/network';
import {parseRaceCup} from './raceCupValidator';
/** Reject malformed progress/results before they can stop a car or declare a winner. */
export function parseRaceRound(raw:unknown):RaceRoundState|null {
  if(!raw||typeof raw!=='object')return null;
  const value=raw as Record<string,unknown>;
  const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  if(!integer(value.round,1,1e9)||!integer(value.totalCheckpoints,3,64)
    ||!integer(value.startAt,0,1e15)||!integer(value.deadlineAt,value.startAt,value.startAt+600000)
    ||(value.phase!=='racing'&&value.phase!=='results')||!Array.isArray(value.standings)||value.standings.length<1||value.standings.length>12)return null;
  const standings:RaceStanding[]=[],ids=new Set<string>();
  for(const rawDriver of value.standings){
    if(!rawDriver||typeof rawDriver!=='object')return null;
    const driver=rawDriver as Record<string,unknown>;
    if(typeof driver.id!=='string'||driver.id.length<1||driver.id.length>64||ids.has(driver.id)
      ||typeof driver.nickname!=='string'||driver.nickname.length>32||typeof driver.vehicleId!=='string'||driver.vehicleId.length>64
      ||!integer(driver.completedCheckpoints,0,value.totalCheckpoints))return null;
    const {status,reason,finishMs,completedCheckpoints}=driver;
    if(status==='finished'){
      if(reason!==null||!integer(finishMs,0,600000)||completedCheckpoints!==value.totalCheckpoints)return null;
    }else if(status==='racing'||status==='dnf'){
      if(finishMs!==null||completedCheckpoints===value.totalCheckpoints)return null;
      if(status==='racing'&&(reason!==null||value.phase==='results'))return null;
      if(status==='dnf'&&reason!=='left'&&reason!=='teleport'&&reason!=='timeout')return null;
    }else return null;
    ids.add(driver.id);
    standings.push({id:driver.id,nickname:driver.nickname,vehicleId:driver.vehicleId,status,reason:reason as RaceStanding['reason'],finishMs:finishMs as number|null,completedCheckpoints});
  }
  const cup=value.cup===undefined?undefined:parseRaceCup(value.cup);
  if(cup===null)return null;
  return {round:value.round,totalCheckpoints:value.totalCheckpoints,startAt:value.startAt,deadlineAt:value.deadlineAt,phase:value.phase,standings,...(cup?{cup}:{})};
}
