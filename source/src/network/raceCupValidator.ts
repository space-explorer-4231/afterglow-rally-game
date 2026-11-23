import type {RaceCupState,RaceCupStanding} from '@/types/network';

/** Bound room history and reject corrupt points before rendering the championship. */
export function parseRaceCup(raw:unknown):RaceCupState|null {
  if(!raw||typeof raw!=='object')return null;
  const cup=raw as Record<string,unknown>;
  const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  if(!integer(cup.number,1,1e9)||!integer(cup.race,1,3)||!integer(cup.completed,0,3)||cup.totalRaces!==3
    ||cup.race!==Math.min(3,cup.completed+1)&&cup.race!==cup.completed
    ||!Array.isArray(cup.standings)||cup.standings.length<1||cup.standings.length>36)return null;
  const standings:RaceCupStanding[]=[],ids=new Set<string>();
  for(const rawEntry of cup.standings){
    if(!rawEntry||typeof rawEntry!=='object')return null;
    const entry=rawEntry as Record<string,unknown>;
    if(typeof entry.id!=='string'||entry.id.length<1||entry.id.length>64||ids.has(entry.id)
      ||typeof entry.nickname!=='string'||entry.nickname.length>32
      ||!integer(entry.points,0,36)||!integer(entry.lastPoints,0,12)||entry.lastPoints>entry.points
      ||!integer(entry.finishes,0,cup.completed)||!integer(entry.wins,0,entry.finishes)
      ||!integer(entry.totalMs,0,entry.finishes*600000)||entry.points>entry.finishes*12)return null;
    ids.add(entry.id);
    standings.push({id:entry.id,nickname:entry.nickname,points:entry.points,lastPoints:entry.lastPoints,
      finishes:entry.finishes,wins:entry.wins,totalMs:entry.totalMs});
  }
  const {championId}=cup;
  if(championId!==null&&(typeof championId!=='string'||cup.completed!==3||standings[0].id!==championId||standings[0].points===0))return null;
  if(cup.completed===3&&standings[0].points>0&&championId===null)return null;
  return {number:cup.number,race:cup.race,completed:cup.completed,totalRaces:3,championId,standings};
}
