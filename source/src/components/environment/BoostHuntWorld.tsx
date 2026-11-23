import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CatmullRomCurve3,Vector3} from 'three';
import {useTerrainData} from '@/components/terrain/TerrainContext';
import {getInterpolatedHeight} from '@/utils/terrainCompiler';
import {useBoostHuntStore} from '@/store/boostHuntStore';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {emitGameEvent,onGameEvent} from '@/utils/events';

/** Three reusable rings, local free-roam challenge; no colliders or external assets. */
export function BoostHuntWorld(){
 const {levelData,heightmapData}=useTerrainData(),car=useGameStore(s=>s.selectedVehicleId);
 const active=useBoostHuntStore(s=>s.active),target=useBoostHuntStore(s=>s.target);
 const elapsed=useRef(0),last=useRef<[number,number]|null>(null);
 const route=useMemo(()=>{const curve=new CatmullRomCurve3(levelData.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5);const count=Math.max(48,Math.min(192,Math.round(curve.getLength()/45)));return curve.getSpacedPoints(count).slice(0,-1).map((p,i,all)=>{const next=all[(i+1)%count];return {x:p.x,z:p.z,y:getInterpolatedHeight(p.x,p.z,heightmapData.heights,heightmapData.rows,heightmapData.cols,levelData.terrainBase.width,levelData.terrainBase.depth)+3.2,yaw:Math.atan2(next.x-p.x,next.z-p.z)};});},[levelData,heightmapData]);
 useEffect(()=>{useBoostHuntStore.getState().stop();last.current=null;return()=>useBoostHuntStore.getState().stop();},[route,car]);
 useEffect(()=>{let previous=performance.now();const timer=window.setInterval(()=>{const now=performance.now(),dt=(now-previous)/1000;previous=now;const game=useGameStore.getState();if(game.gameState==='playing'&&game.gameMode==='freeroam'&&game.isSceneReady&&game.recoveryCountdown===0&&!document.hidden&&!useMultiplayerStore.getState().isSpectating)useBoostHuntStore.getState().tick(dt);},100);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>onGameEvent('vehicle_reset',()=>{last.current=null;const s=useBoostHuntStore.getState();if(s.active)s.stop();}),[]);
 useFrame((_,dt)=>{
  const game=useGameStore.getState(),hunt=useBoostHuntStore.getState();
  if(!hunt.active)return;
  if(game.gameMode!=='freeroam'){hunt.stop();return;}
  if(game.gameState!=='playing'||!game.isSceneReady||game.recoveryCountdown>0||document.hidden||useMultiplayerStore.getState().isSpectating){last.current=null;return;}
  elapsed.current+=Math.min(dt,.1);if(elapsed.current<.1)return;const step=elapsed.current;elapsed.current=0;
  if(hunt.target<0){let nearest=0,distance=Infinity;for(let i=0;i<route.length;i++){const d=(route[i].x-game.position[0])**2+(route[i].z-game.position[2])**2;if(d<distance){nearest=i;distance=d;}}useBoostHuntStore.setState({target:nearest+1});last.current=[game.position[0],game.position[2]];return;}
  if(!useBoostHuntStore.getState().active)return;
  const point=route[hunt.target%route.length],x=game.position[0],z=game.position[2],previous=last.current;
  if(!previous){last.current=[x,z];return;}
  const dx=x-previous[0],dz=z-previous[1],distance=dx*dx+dz*dz;
  const t=distance>0?Math.max(0,Math.min(1,((point.x-previous[0])*dx+(point.z-previous[1])*dz)/distance)):0;
  const near=Math.hypot(point.x-previous[0]-t*dx,point.z-previous[1]-t*dz)<6;
  if(near&&distance<Math.max(20,game.speed/3.6*step*2)**2&&Math.abs(game.position[1]-(point.y-3.2))<5&&!game.pendingReset&&!game.isRolledOver){const reward=hunt.collect();if(reward)emitGameEvent('nitro_reward',{fraction:reward});}
  previous[0]=x;previous[1]=z;
 });
 return <group visible={active&&target>=0}>{[0,1,2].map((offset)=>{const p=route[((Math.max(0,target)+offset)%route.length)];return <group key={offset} position={[p.x,p.y,p.z]} rotation={[0,p.yaw,0]} scale={offset===0?1:.85}>
  <mesh><torusGeometry args={[4.7,.18,6,32]}/><meshBasicMaterial color={offset===0?'#ffbd4a':'#a9d8b1'} transparent opacity={offset===0?.95:.45} toneMapped={false}/></mesh>
  <mesh position={[0,5.5,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.7,1.2,3]}/><meshBasicMaterial color="#ffbd4a" toneMapped={false}/></mesh>
 </group>;})}</group>;
}


