import type {RaceStartState,RaceRoundState} from '@/types/network';
/** Give lobby/results controls their own screen instead of stacking them over driving widgets. */
export function isSharedRacePanelOpen(mode:string|undefined,start:RaceStartState|null,round:RaceRoundState|null,selfId:string|null):boolean {
  if(mode!=='timeattack'||!start)return false;
  if(start.phase==='waiting'||start.phase==='results')return true;
  return round?.round===start.round&&!!round.standings.some(driver=>driver.id===selfId&&driver.status!=='racing');
}
