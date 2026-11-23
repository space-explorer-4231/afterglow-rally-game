import {useEffect,useMemo,useRef,type RefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Object3D,Quaternion,Vector3} from 'three';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useRacingStore} from '@/store/racingStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useLapGhostStore} from '@/store/lapGhostStore';
import {getLevelPreset} from '@/config/levelRegistry';
import {onGameEvent} from '@/utils/events';
import {appendLapGhost,beginLapGhost,createLapGhostRecorder,finishLapGhost,recordGhostSplit,invalidateLapGhost,type GhostPose} from '@/utils/lapGhost';
import {clearLapGhosts,lapGhostKey,loadLapGhost,saveLapGhost} from '@/utils/lapGhostStorage';

interface GhostScratch {position:Vector3;rotation:Quaternion;pose:GhostPose}
function readVisualPose(object:Object3D|null,scratch:GhostScratch):boolean {
  if(!object)return false;
  object.getWorldPosition(scratch.position);object.getWorldQuaternion(scratch.rotation);
  const p=scratch.pose,v=scratch.position,q=scratch.rotation;p.x=v.x;p.y=v.y;p.z=v.z;p.qx=q.x;p.qy=q.y;p.qz=q.z;p.qw=q.w;return true;
}

/** Record the interpolated visual transform; no extra Rapier queries or frame allocations. */
export function useLapGhost(visual:RefObject<Object3D|null>):void {
  const map=useGameStore(s=>s.selectedLevelId),car=useGameStore(s=>s.selectedVehicleId),tire=useGameStore(s=>s.selectedTireType),mode=useGameStore(s=>s.gameMode);
  const drive=useSettingsStore(s=>s.drivetrainMode),transmission=useSettingsStore(s=>s.transmissionMode);
  const abs=useSettingsStore(s=>s.absEnabled),tcs=useSettingsStore(s=>s.tcsEnabled),esp=useSettingsStore(s=>s.espEnabled);
  const key=lapGhostKey(map,car,tire,drive,transmission,abs,tcs,esp);
  const count=getLevelPreset(map).data.track.points.length;
  const recorder=useMemo(()=>createLapGhostRecorder(count),[count]);
  const scratch=useMemo(()=>({position:new Vector3(),rotation:new Quaternion(),pose:{x:0,y:0,z:0,qx:0,qy:0,qz:0,qw:1} satisfies GhostPose}),[]);
  const recording=useRef(false),previousKey=useRef(key);


  useEffect(()=>{
    recording.current=false;
    useLapGhostStore.setState({record:loadLapGhost(key,count),message:'Complete a clean lap to create your ghost',splitDelta:null,checkpoint:0});
    const begin=(notice?:string)=>{
      if(useMultiplayerStore.getState().currentRoom)return;
      beginLapGhost(recorder);recording.current=true;
      if(!readVisualPose(visual.current,scratch)||!appendLapGhost(recorder,0,scratch.pose))invalidateLapGhost(recorder);
      useLapGhostStore.setState({splitDelta:null,checkpoint:0,message:notice??(useLapGhostStore.getState().record?'Chase your personal best · cyan ghost':'Recording your first clean lap')});
    };
    const invalidate=()=>{
      if(!recording.current)return;
      invalidateLapGhost(recorder);useLapGhostStore.setState({message:'Lap excluded · next clean lap can save a ghost',splitDelta:null});
    };
    if(mode==='timeattack'&&useRacingStore.getState().raceStatus==='racing'){
      begin();
      const race=useRacingStore.getState();
      if(key!==previousKey.current||race.currentLapTime>0.25||race.currentCheckpoint!==1)invalidate();
    }
    previousKey.current=key;
    const unsubscribe=useRacingStore.subscribe((next,previous)=>{
      if(useGameStore.getState().gameMode!=='timeattack'||useMultiplayerStore.getState().currentRoom)return;
      if(next.lapCount!==previous.lapCount){
        let notice:string|undefined;
        if(recording.current){
          if(previous.isLapInvalidated||useMultiplayerStore.getState().isSpectating)invalidateLapGhost(recorder);
          if(readVisualPose(visual.current,scratch))appendLapGhost(recorder,previous.currentLapTime,scratch.pose,true);
          const result=finishLapGhost(recorder,previous.currentLapTime),best=useLapGhostStore.getState().record;
          if(result&&(!best||result.duration<best.duration)){
            const saved=saveLapGhost(key,result);
            notice=saved?'NEW PERSONAL BEST · ghost saved':'NEW PERSONAL BEST · ghost available this session';
            useLapGhostStore.setState({record:result});
          }else if(result&&best){
            notice='Last lap '+result.duration.toFixed(2)+'s · +'+(result.duration-best.duration).toFixed(2)+'s';
          }
        }
        begin(notice);
      }else if(next.raceStatus==='racing'&&previous.raceStatus!=='racing')begin();
      else if(next.raceStatus!=='racing'){recording.current=false;}
      if(next.isLapInvalidated)invalidate();
    });
    const checkpoint=onGameEvent('checkpoint_passed',event=>{
      if(mode!=='timeattack'||useMultiplayerStore.getState().currentRoom||!recording.current)return;
      const time=useRacingStore.getState().currentLapTime;
      if(recordGhostSplit(recorder,event.checkpointIndex,time)){
        const best=useLapGhostStore.getState().record,reference=best?.splits[event.checkpointIndex];
        useLapGhostStore.setState({checkpoint:event.checkpointIndex,splitDelta:reference?time-reference:null});
      }
    });
    const reset=onGameEvent('vehicle_reset',invalidate);
    const clear=onGameEvent('track_records_reset',()=>{clearLapGhosts();useLapGhostStore.setState({record:null,splitDelta:null,message:'Records cleared · complete a clean lap'});invalidate();});
    return()=>{unsubscribe();checkpoint();reset();clear();recording.current=false;};
  },[key,count,mode,recorder,scratch,visual]);

  useFrame(()=>{
    if(!recording.current||recorder.invalid)return;
    if(useMultiplayerStore.getState().currentRoom){recording.current=false;return;}
    const game=useGameStore.getState(),race=useRacingStore.getState();
    if(game.gameState!=='playing'||!game.isSceneReady)return;
    if(game.isGarageOpen||document.hidden||game.pendingReset||useMultiplayerStore.getState().isSpectating){
      invalidateLapGhost(recorder);useLapGhostStore.setState({message:'Lap excluded · next clean lap can save a ghost',splitDelta:null});return;
    }
    const previous=recorder.count?recorder.poses[(recorder.count-1)*8]:-1;
    if(race.currentLapTime-previous<0.1)return;
    if(readVisualPose(visual.current,scratch))appendLapGhost(recorder,race.currentLapTime,scratch.pose);
    if(recorder.invalid)useLapGhostStore.setState({message:'Replay limit or discontinuity · try another lap',splitDelta:null});
  });
}
