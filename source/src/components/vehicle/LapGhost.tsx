import {Suspense,useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Group,type MeshBasicMaterial} from 'three';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useRacingStore} from '@/store/racingStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useLapGhostStore} from '@/store/lapGhostStore';
import {getVehiclePreset} from '@/config/vehicleRegistry';
import {sampleLapGhost,type GhostPose} from '@/utils/lapGhost';
import {createGhostVisual} from '@/utils/ghostVisual';
import {fitWheelModel} from '@/utils/wheelPresentation';
import {versionedAsset} from '@/utils/versionedAsset';
import {VehicleModelErrorBoundary} from './Vehicle';

function GhostModel(){
  const car=useGameStore(s=>s.selectedVehicleId),quality=useSettingsStore(s=>s.graphicsQuality);
  const preset=getVehiclePreset(car),path=preset.optimizedModelPath??preset.modelPath;
  const {scene}=useGLTF(versionedAsset(path));
  const {scene:wheelScene}=useGLTF(versionedAsset(preset.wheelModelPath??'/models/vehicles/wheel_opt.glb'));
  const body=useMemo(()=>createGhostVisual(scene),[scene]);
  const wheels=useMemo(()=>preset.config.wheels.map((wheel,i)=>({resource:createGhostVisual(wheelScene),fit:fitWheelModel(wheelScene,wheel.radius,i%2===1)})),[wheelScene,preset]);
  const group=useRef<Group>(null),pose=useMemo<GhostPose>(()=>({x:0,y:0,z:0,qx:0,qy:0,qz:0,qw:1}),[]);
  const materials=useRef<MeshBasicMaterial[]>([]);
  useEffect(()=>{materials.current=[body.material,...wheels.map(wheel=>wheel.resource.material)];},[body,wheels]);
  useEffect(()=>()=>body.dispose(),[body]);
  useEffect(()=>()=>{for(const wheel of wheels)wheel.resource.dispose();},[wheels]);
  useFrame(()=>{
    const object=group.current;if(!object)return;
    const game=useGameStore.getState(),race=useRacingStore.getState(),record=useLapGhostStore.getState().record;
    object.visible=false;
    if(!record||game.gameState!=='playing'||!game.isSceneReady||game.gameMode!=='timeattack'
      ||game.isGarageOpen||race.raceStatus!=='racing'||useMultiplayerStore.getState().isSpectating
      ||!sampleLapGhost(record,race.currentLapTime,pose))return;
    const dx=pose.x-game.position[0],dy=pose.y-game.position[1],dz=pose.z-game.position[2],distance=Math.hypot(dx,dy,dz);
    if(distance<2||distance>(quality==='low'?100:220))return;
    object.visible=true;object.position.set(pose.x,pose.y,pose.z);object.quaternion.set(pose.qx,pose.qy,pose.qz,pose.qw);
    const opacity=0.28*Math.min(1,(distance-2)/6);
    for(let i=0;i<materials.current.length;i++)materials.current[i].opacity=opacity;
  });
  return <group ref={group} visible={false}>
    <primitive object={body.model} dispose={null} position={preset.modelPositionOffset??[0,0.2,0.1]} scale={preset.modelScale??[1,1,1]} rotation={preset.modelRotationOffset??[0,0,0]}/>
    {preset.config.wheels.map((wheel,i)=><group key={i} position={[wheel.position[0],wheel.position[1]-wheel.suspensionRestLength*0.72,wheel.position[2]]}>
      <primitive object={wheels[i].resource.model} dispose={null} scale={wheels[i].fit.scale} position={wheels[i].fit.offset} rotation={[0,i%2===1?0:Math.PI,0]}/>
    </group>)}
  </group>;
}
/** A personal, non-colliding replay; never broadcast as a room player. */
export function LapGhost(){
  const mode=useGameStore(s=>s.gameMode),record=useLapGhostStore(s=>s.record),car=useGameStore(s=>s.selectedVehicleId);
  const online=useMultiplayerStore(s=>s.currentRoom!==null);
  if(mode!=='timeattack'||online||!record)return null;
  return <VehicleModelErrorBoundary resetKey={car} fallback={null}><Suspense fallback={null}><GhostModel/></Suspense></VehicleModelErrorBoundary>;
}
