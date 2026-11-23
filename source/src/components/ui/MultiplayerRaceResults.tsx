import {useEffect,useRef} from 'react';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {networkClient} from '@/network/networkClient';
import {useRacePanelNavigation} from '@/hooks/useRacePanelNavigation';
import {RaceCupTable} from './RaceCupTable';
import './MultiplayerRaceLobby.css';
/** Everyone receives the same server-timed one-lap standings and next-round outcome. */
export function MultiplayerRaceResults(){
  const room=useMultiplayerStore(s=>s.currentRoom),round=useMultiplayerStore(s=>s.raceRound),self=useMultiplayerStore(s=>s.selfId),host=useMultiplayerStore(s=>s.isHost);
  const start=useMultiplayerStore(s=>s.raceStart);
  const panel=useRef<HTMLElement>(null),remaining=useRef<HTMLSpanElement>(null);
  const mine=round?.standings.find(driver=>driver.id===self);
  const current=start?.phase!=='waiting'&&start?.round===round?.round;
  const shown=current&&room?.gameMode==='timeattack'&&!!round&&(round.phase==='results'||mine?.status==='finished'||mine?.status==='dnf');
  useRacePanelNavigation(panel,!!shown);
  useEffect(()=>{
    if(!round)return;
    const refresh=()=>{if(remaining.current)remaining.current.textContent=String(Math.max(0,Math.ceil((round.deadlineAt-Date.now()-useMultiplayerStore.getState().serverClockOffset)/1000)));};
    refresh();const timer=window.setInterval(refresh,250);return()=>window.clearInterval(timer);
  },[round]);
  if(!round||room?.gameMode!=='timeattack'||!current)return null;
  const cup=round.cup;
  const champion=cup?.standings.find(driver=>driver.id===cup.championId);
  const cupMine=cup?.standings.find(driver=>driver.id===self);
  if(!shown)return <aside className="race-live" aria-label="Shared checkpoint standings">
    <div className="race-grid-eyebrow">{cup?`CLUB CUP ${cup.number} / RACE ${cup.race} OF 3`:'ROOM RACE / ONE LAP'}</div>
    {cup&&<div className="race-cup-chase"><span>{cupMine?`Cup position ${cup.standings.findIndex(driver=>driver.id===self)+1} · ${cupMine.points} pts`:'Join the next race to score'}</span><strong>{cupMine&&cup.standings[0].points>cupMine.points?`${cup.standings[0].points-cupMine.points} to lead`:'Race for 12 pts'}</strong></div>}
    <div className="race-live-self"><span>{mine?'Your gates':'Spectating'}</span><strong>{mine?mine.completedCheckpoints+'/'+round.totalCheckpoints:'NEXT ROUND'}</strong></div>
    {round.standings.slice(0,4).map(driver=><div className="race-live-row" key={driver.id}><span>{driver.nickname}{driver.id===self?' · YOU':''}</span><strong>{driver.finishMs!==null?'FINISHED':driver.status==='dnf'?'DNF':driver.completedCheckpoints+'/'+round.totalCheckpoints}</strong></div>)}
    <small><span ref={remaining}>—</span>s left · gates in order</small>
  </aside>;
  const winner=round.standings.find(driver=>driver.status==='finished');
  return <section ref={panel} className="race-grid race-results" aria-label="Shared race results">
    <div className="race-grid-eyebrow">{cup?`AEROLINE CLUB CUP ${cup.number} / RACE ${cup.race} OF 3`:'AEROLINE / ONE-LAP ROOM RACE'}</div>
    <h2>{champion?`${champion.nickname} takes the Cup!`:round.phase==='results'?(winner?winner.nickname+' wins!':'Round complete.'):mine?.status==='finished'?'Finish line crossed!':'This run did not finish.'}</h2>
    <p>{round.phase==='results'?(cup?.completed===3?'Cup complete! A fresh three-race Cup starts automatically after 10 seconds.':`Next race starts automatically after 10 seconds.${cup?' Your Cup points carry over.':' Same room, same friends.'}`):<>Waiting for the rest of the field · <span ref={remaining}>—</span> seconds remaining.</>}</p>
    {cup&&round.phase==='results'?<RaceCupTable cup={cup} self={self}/>:<ol className="race-grid-drivers">{round.standings.map((driver,index)=><li key={driver.id}>
      <span>{driver.status==='finished'?index+1+'. ':''}{driver.nickname}{driver.id===self?' (You)':''}</span>
      <strong>{driver.finishMs!==null?(driver.finishMs/1000).toFixed(2)+'s':driver.status==='dnf'?'DNF · '+(driver.reason==='left'?'left':driver.reason==='teleport'?'recovery/jump':'time limit'):'CP '+driver.completedCheckpoints+'/'+round.totalCheckpoints}</strong>
    </li>)}</ol>}
    {cup&&round.phase==='results'&&<p className="race-cup-lap">This lap: {winner?`${winner.nickname} · ${((winner.finishMs??0)/1000).toFixed(2)}s`:'No finishers'}{mine?.finishMs!==null&&mine?.finishMs!==undefined?` · Your time ${(mine.finishMs/1000).toFixed(2)}s`:''}</p>}
    <p className="race-grid-small">One lap · gates in order · 30 seconds after the first finish. Pausing does not stop the shared clock. Recovery jumps can mark a run DNF.</p>
    {round.phase==='results'&&(host?<button data-race-control className="race-start race-next" onClick={()=>{networkClient.resetRoomRace();networkClient.startRoomRace();}}>{cup?.completed===3?'Start next Cup now':'Race again now'}</button>:<div className="race-grid-hint">Next race starts automatically. Stay in the room.</div>)}
    <small className="race-grid-small">Arrows / D-pad to select · Enter / A / Cross to confirm</small>
  </section>;
}
