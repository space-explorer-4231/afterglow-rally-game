import {useDriveActivityStore} from '@/store/driveActivityStore';
import {BoostHuntPanel} from './BoostHuntPanel';

import './boostHunt.css';
import {useEffect} from 'react';
import {CatmullRomCurve3,Vector3} from 'three';
import {getLevelPreset} from '@/config/levelRegistry';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useDriftClubStore} from '@/store/driftClubStore';
import {createRoadRun,advanceRoadRun,interruptRoadRun,parseRoadRunBest} from '@/utils/roadRun';
import './roadRun.css';
import {emitGameEvent} from '@/utils/events';

/** Passive practice loop: four sector splits and road accuracy, no setup or extra controls. */
export function RoadRun(){
  const map=useGameStore(s=>s.selectedLevelId),car=useGameStore(s=>s.selectedVehicleId),tire=useGameStore(s=>s.selectedTireType);
  const mode=useGameStore(s=>s.gameMode),spectating=useMultiplayerStore(s=>s.isSpectating);
  const drive=useSettingsStore(s=>s.drivetrainMode),esp=useSettingsStore(s=>s.espEnabled),abs=useSettingsStore(s=>s.absEnabled),tcs=useSettingsStore(s=>s.tcsEnabled),trans=useSettingsStore(s=>s.transmissionMode);
  const key=`aeroline_road_run_v1:${map}:${car}:${tire}:${drive}:${esp}:${abs}:${tcs}:${trans}`;
  const activity=useDriveActivityStore(s=>s.activity);
  useEffect(()=>{
    const level=getLevelPreset(map),curve=new CatmullRomCurve3(level.data.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5);
    const points=curve.getSpacedPoints(256),run=createRoadRun();
    try{run.best=parseRoadRunBest(localStorage.getItem(key));}catch{/* Optional records never block driving. */}
    let last=performance.now(),nonce=useDriftClubStore.getState().resetNonce,saved=run.best;
    const sample={progress:0,distance:0,x:0,z:0,speed:0,dt:0,eligible:false,reset:false};
    const timer=window.setInterval(()=>{
      const now=performance.now(),game=useGameStore.getState(),nextNonce=useDriftClubStore.getState().resetNonce;
      sample.dt=(now-last)/1000;last=now;
      if(game.recoveryCountdown>0||game.gameState!=='playing'||!game.isSceneReady||game.isGarageOpen||document.hidden||game.gameMode!=='freeroam'||useMultiplayerStore.getState().isSpectating){interruptRoadRun(run);nonce=nextNonce;return;}
      const x=game.position[0],z=game.position[2];let nearest=Infinity,progress=0;
      for(let i=0;i<256;i++){
        const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
        const t=length>0?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;
        const distance=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;
        if(distance<nearest){nearest=distance;progress=(i+t)/256%1;}
      }
      sample.x=x;sample.z=z;sample.progress=progress;sample.distance=Math.sqrt(nearest);sample.speed=game.speed;
      sample.eligible=!game.isAirborne&&!game.isRolledOver&&game.gear>0;sample.reset=game.pendingReset||nonce!==nextNonce;nonce=nextNonce;
      const quarter=run.quarter;
      advanceRoadRun(run,sample,level.data.track.width/2);
      if(run.quarter>quarter&&sample.distance<=level.data.track.width/2&&!sample.reset&&game.recoveryCountdown===0)emitGameEvent('nitro_reward',{fraction:run.quarter===2||run.quarter===4?1:.35});
      if(run.best!==saved){try{localStorage.setItem(key,String(run.best));}catch{/* Session best still works. */}saved=run.best;}
    },200);
    return()=>window.clearInterval(timer);
  },[key,map]);
  if(mode!=='freeroam'||spectating)return null;
  // Practice tracking keeps running quietly; only a selected challenge needs a HUD.
  if(activity==='hunt')return <aside className="road-run active-road-challenge" aria-label="Boost Hunt road challenge"><BoostHuntPanel/></aside>;
  return null;
}
