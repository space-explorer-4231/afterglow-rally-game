import {chooseDriveActivity,useDriveActivityStore} from '@/store/driveActivityStore';
import {onGameEvent} from '@/utils/events';
import {useEffect,useRef,useState} from 'react';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useDriftClubStore} from '@/store/driftClubStore';
import {advanceDriftHeat,createDriftHeat,DRIFT_HEAT_SECONDS,driftMedal} from '@/utils/driftChallenge';
export function DriftClub(){
  const activity=useDriveActivityStore(s=>s.activity);
  useEffect(()=>onGameEvent('drive_activity',event=>{heat.current=createDriftHeat(event.activity==='drift');setView({...heat.current});useDriftClubStore.getState().setScore(0);useDriftClubStore.getState().setActive(event.activity==='drift');}),[]);
  const mode=useGameStore(s=>s.gameMode),car=useGameStore(s=>s.selectedVehicleId),map=useGameStore(s=>s.selectedLevelId);
  const phase=useGameStore(s=>s.gameState),ready=useGameStore(s=>s.isSceneReady);
  const roomId=useMultiplayerStore(s=>s.currentRoom?.id),spectating=useMultiplayerStore(s=>s.isSpectating);
  const heat=useRef(createDriftHeat()),[view,setView]=useState(createDriftHeat()),[best,setBest]=useState(0);
  const remoteScores=useDriftClubStore(s=>s.remoteScores),players=useMultiplayerStore(s=>s.remotePlayers);
  const recordKey='aeroline_driftclub_v1:'+map+':'+car;
  useEffect(()=>{heat.current=createDriftHeat();setView({...heat.current});useDriftClubStore.getState().clear();let value=0;try{const parsed=Number(localStorage.getItem(recordKey));if(Number.isFinite(parsed)&&parsed>=0&&parsed<=1e8)value=parsed;}catch{/* storage optional */}setBest(value);return()=>useDriftClubStore.getState().clear();},[recordKey,roomId,mode]);
  useEffect(()=>{
    let last=performance.now(),lastReset=useDriftClubStore.getState().resetNonce;const sample={speed:0,angle:0,airborne:false,rollover:false,reset:false,burnout:false,dt:0};
    const unsubscribe=useGameStore.subscribe((s,previous)=>{if(s.pendingReset&&!previous.pendingReset)sample.reset=true;});
    const timer=window.setInterval(()=>{
      const now=performance.now(),s=useGameStore.getState(),h=heat.current;sample.dt=(now-last)/1000;last=now;
      if(s.gameState!=='playing'||!s.isSceneReady||document.hidden||mode!=='freeroam'||spectating)return;
      const resetNonce=useDriftClubStore.getState().resetNonce;sample.reset=sample.reset||resetNonce!==lastReset;lastReset=resetNonce;
      sample.speed=s.speed;sample.angle=s.slipAngle;sample.airborne=s.isAirborne;sample.rollover=s.isRolledOver;sample.burnout=s.burnout;
      const wasRunning=h.phase==='running';advanceDriftHeat(h,sample);sample.reset=false;
      if(wasRunning){useDriftClubStore.getState().setScore(h.banked);setView({...h});}
      if(wasRunning&&h.phase==='finished'){useDriftClubStore.getState().setActive(false);setBest(previous=>{const result=Math.max(previous,h.banked);try{localStorage.setItem(recordKey,String(result));}catch{/* storage optional */}return result;});}
    },100);return()=>{window.clearInterval(timer);unsubscribe();};
  },[recordKey,mode,spectating]);
  if(activity!=='drift'||mode!=='freeroam'||spectating||phase!=='playing'||!ready)return null;
  const ranking=[{id:'self',name:'You',score:view.banked},...Object.values(players).map(p=>({id:p.id,name:p.nickname,score:remoteScores[p.id]??0}))].sort((a,b)=>b.score-a.score).slice(0,4);
  return <aside className="drift-club" data-heat-phase={view.phase} data-combo={view.chain>0} aria-label="Drift Club">
    <div className="drift-club__eyebrow"><span className="festival-spark" aria-hidden="true">✦</span> DRIFT CLUB</div>
    <div className="drift-club__score"><strong>{view.banked.toLocaleString()}</strong><span>{Math.ceil(DRIFT_HEAT_SECONDS-view.elapsed)}s</span></div>
    {view.phase==='running'?<><div className="drift-club__chain">+{Math.floor(view.chain).toLocaleString()} unbanked · ×{view.multiplier}</div><div className="drift-club__note">{view.message}</div><progress max={90} value={90-view.elapsed}/></>:<><div className="drift-club__note">{view.phase==='finished'?driftMedal(view.banked):'90 seconds. Make every corner count.'}</div><button onClick={event=>{event.currentTarget.blur();chooseDriveActivity('drift');}}>{view.phase==='finished'?'Run another heat':'Start drift heat'}</button></>}
    <details><summary>Rules · best {best.toLocaleString()}</summary><p>30–220 km/h · 12–65° slides. Link corners for combos. Straighten for 1.5s to bank. Spins and resets lose your chain. Bank before time runs out.</p></details>
    <div id="render-fps" className="drift-club__note">Measuring FPS…</div>
    {roomId&&<div className="drift-club__ranking"><div className="drift-club__eyebrow">ROOM · PERSONAL HEAT SCORES</div>{ranking.map((p,i)=><div key={p.id}><span>{i+1}. {p.name}</span><strong>{p.score.toLocaleString()}</strong></div>)}<small>Each driver starts their own 90-second heat.</small></div>}
  </aside>;
}

