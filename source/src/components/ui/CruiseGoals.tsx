import {useEffect,useRef,useState} from 'react';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useDriftClubStore} from '@/store/driftClubStore';
import {useSettingsStore} from '@/store/settingsStore';
import {createRoadMasteryTracker,parseRoadMastery,advanceRoadMastery,roadMasteryBadges,roadMasteryRank,ROAD_MASTERY_GOALS} from '@/utils/roadMastery';
import './roadMastery.css';

/** Passive progression needs no extra driving controls. */
export function CruiseGoals(){
  const mode=useGameStore(s=>s.gameMode),phase=useGameStore(s=>s.gameState),ready=useGameStore(s=>s.isSceneReady);
  const car=useGameStore(s=>s.selectedVehicleId),map=useGameStore(s=>s.selectedLevelId);
  const spectating=useMultiplayerStore(s=>s.isSpectating),units=useSettingsStore(s=>s.speedUnit);
  const key='aeroline_road_mastery_v1:'+map+':'+car;
  const [progress,setProgress]=useState(()=>parseRoadMastery(null));
  const [notice,setNotice]=useState('Progress saves for this car and district');
  const owned=useRef(parseRoadMastery(null));
  useEffect(()=>{
    try{owned.current=parseRoadMastery(localStorage.getItem(key));}catch{owned.current=parseRoadMastery(null);}
    setProgress({...owned.current});setNotice('Progress saves for this car and district');
    const tracker=createRoadMasteryTracker();let last=performance.now(),ticks=0,nonce=useDriftClubStore.getState().resetNonce,noticeUntil=0;
    const sample={x:0,z:0,speed:0,angle:0,dt:0,grounded:false,forward:false,nitro:false,reset:false};
    const save=()=>{try{localStorage.setItem(key,JSON.stringify(owned.current));}catch{/* Driving works with storage disabled. */}};
    const timer=window.setInterval(()=>{
      const now=performance.now(),s=useGameStore.getState(),nextNonce=useDriftClubStore.getState().resetNonce;
      sample.dt=(now-last)/1000;last=now;
      if(s.gameState!=='playing'||!s.isSceneReady||s.isGarageOpen||document.hidden||s.gameMode!=='freeroam'||useMultiplayerStore.getState().isSpectating){tracker.anchored=false;nonce=nextNonce;return;}
      sample.x=s.position[0];sample.z=s.position[2];sample.speed=s.speed;sample.angle=s.slipAngle;
      sample.grounded=!s.isAirborne&&!s.isRolledOver&&!s.burnout;sample.forward=s.gear>0;sample.nitro=s.nitroActive;sample.reset=s.pendingReset||nonce!==nextNonce;nonce=nextNonce;
      const before=roadMasteryBadges(owned.current);advanceRoadMastery(owned.current,tracker,sample);
      const after=roadMasteryBadges(owned.current);
      if(after>before){setNotice('MILESTONE · '+roadMasteryRank(after));noticeUntil=now+5000;save();}
      else if(noticeUntil&&now>noticeUntil){setNotice('Progress saves for this car and district');noticeUntil=0;}
      setProgress({...owned.current});if(++ticks%25===0)save();
    },200);
    window.addEventListener('pagehide',save);
    return()=>{window.clearInterval(timer);window.removeEventListener('pagehide',save);save();};
  },[key]);
  if(mode!=='freeroam'||phase!=='playing'||!ready||spectating)return null;
  const badges=roadMasteryBadges(progress);
  return <aside className="road-mastery" aria-label="Road Mastery">
    <div className="road-mastery__header"><span>ROAD MASTERY</span><strong>{badges}/9 MILESTONES</strong></div>
    <div className="road-mastery__rank">{roadMasteryRank(badges)}</div>
    <div className="road-mastery__goals">{ROAD_MASTERY_GOALS.map(goal=>{
      const level=goal.targets.filter(target=>progress[goal.key]>=target).length;
      const target=goal.targets[Math.min(level,2)],feet=goal.unit==='m'&&units==='mph';
      const factor=feet?3.28084:1,label=feet?'ft':goal.unit;
      return <div key={goal.key}><div><span>{goal.title} <b>{level}/3</b></span><small>{Math.floor(progress[goal.key]*factor).toLocaleString()} / {Math.round(target*factor).toLocaleString()} {label}</small></div><progress aria-label={goal.title} max={target} value={progress[goal.key]}/></div>;
    })}</div>
    <div className="road-mastery__notice" role="status">{notice}</div>
  </aside>;
}
