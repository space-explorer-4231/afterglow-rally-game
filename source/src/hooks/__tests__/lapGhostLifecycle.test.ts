import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import type {EffectCallback} from 'react';
import {Group} from 'three';
import {useLapGhost} from '../useLapGhost';
import {useGameStore} from '@/store/gameStore';
import {useRacingStore} from '@/store/racingStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useLapGhostStore} from '@/store/lapGhostStore';
import {getLevelPreset} from '@/config/levelRegistry';
import {emitGameEvent} from '@/utils/events';
const {cleanups,frames}=vi.hoisted(()=>({cleanups:[] as (()=>void)[],frames:[] as (()=>void)[]}));
vi.mock('react',async original=>{
  const actual=await original<typeof import('react')>();
  const hooks={useEffect:(effect:EffectCallback)=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);},
    useMemo:<T,>(factory:()=>T)=>factory(),useCallback:<T,>(callback:T)=>callback,useRef:<T,>(current:T)=>({current}),
    useSyncExternalStore:<T,>(_subscribe:unknown,getSnapshot:()=>T)=>getSnapshot(),useDebugValue:()=>{},
  };
  return {...actual,...hooks};
});
vi.mock('@react-three/fiber',()=>({useFrame:(callback:()=>void)=>frames.push(callback)}));
vi.mock('@/store/gameStore',async original=>{
  const actual=await original<typeof import('@/store/gameStore')>(),store=actual.useGameStore;
  return {...actual,useGameStore:Object.assign((selector:(state:ReturnType<typeof store.getState>)=>unknown)=>selector(store.getState()),store)};
});
vi.mock('@/store/settingsStore',async original=>{
  const actual=await original<typeof import('@/store/settingsStore')>(),store=actual.useSettingsStore;
  return {...actual,useSettingsStore:Object.assign((selector:(state:ReturnType<typeof store.getState>)=>unknown)=>selector(store.getState()),store)};
});
vi.mock('@/utils/countdownSound',()=>({playCountdownBeep:vi.fn()}));
const values=new Map<string,string>();let object:Group,count:number;
beforeEach(()=>{
  values.clear();frames.length=0;vi.stubGlobal('document',{hidden:false});
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k),key:(i:number)=>Array.from(values.keys())[i]??null,get length(){return values.size;}});
  useMultiplayerStore.getState().reset();
  useGameStore.setState({gameMode:'timeattack',gameState:'playing',selectedLevelId:'level1',selectedVehicleId:'bmw_m3_drift',selectedTireType:'asphalt',isSceneReady:true,isGarageOpen:false,pendingReset:false});
  count=getLevelPreset('level1').data.track.points.length;
  useRacingStore.setState({raceStatus:'idle',currentCheckpoint:0,totalCheckpoints:count,currentLapTime:0,lapCount:0,isLapInvalidated:false,bestLapTimes:{},bestLapTime:null});
  object=new Group();object.position.set(0,1,25);useLapGhost({current:object});useRacingStore.getState().startRace();
});
afterEach(()=>{for(const cleanup of cleanups)cleanup();cleanups.length=0;vi.unstubAllGlobals();});
function tick(dt=.1,duration=count){
  const next=useRacingStore.getState().currentLapTime+dt;
  object.position.set(Math.sin(next/duration*Math.PI*2)*25,1,Math.cos(next/duration*Math.PI*2)*25);
  useRacingStore.getState().updateTimer(dt);for(const frame of frames)frame();
}
function completeLap(duration=count){
  for(let cp=1;cp<=count;cp++){
    const target=duration*cp/count;
    while(useRacingStore.getState().currentLapTime<target-.00001)tick(Math.min(.1,target-useRacingStore.getState().currentLapTime),duration);
    useRacingStore.getState().passCheckpoint(cp%count);
  }
}
describe('actual race-store ghost lifecycle',()=>{
  it('keeps personal ghosts out of multiplayer races',()=>{
    useMultiplayerStore.getState().setCurrentRoom({id:'ABC123',name:'Room',hostId:'a',hostNickname:'Host',levelId:'level1_island',gameMode:'timeattack',playerCount:2,maxPlayers:12,createdAt:0});
    completeLap();expect(useLapGhostStore.getState().record).toBeNull();
  });
  it('saves a clean lap and records a faster checkpoint on the next lap',()=>{
    completeLap();const best=useLapGhostStore.getState().record;expect(best?.duration).toBeCloseTo(count);expect(values.size).toBeGreaterThan(0);
    for(let i=0;i<8;i++)tick();useRacingStore.getState().passCheckpoint(1);
    expect(useLapGhostStore.getState().splitDelta).toBeCloseTo(-.2);expect(useLapGhostStore.getState().message).toContain('NEW PERSONAL BEST');
  });
  it('retains a faster ghost when the next lap is slower',()=>{completeLap();const best=useLapGhostStore.getState().record;completeLap(count*1.5);expect(useLapGhostStore.getState().record).toBe(best);expect(useLapGhostStore.getState().message).toContain('Last lap');});
  it('replaces the ghost after a faster clean lap',()=>{completeLap(count*1.5);completeLap();expect(useLapGhostStore.getState().record?.duration).toBeCloseTo(count);});
  it('a physics recovery event excludes this lap but permits the following lap',()=>{tick();emitGameEvent('vehicle_reset',{reason:'recovery'});completeLap();expect(useLapGhostStore.getState().record).toBeNull();completeLap();expect(useLapGhostStore.getState().record).not.toBeNull();});
  it('the racing store invalidation excludes a lap even without a reset event',()=>{useRacingStore.getState().invalidateCurrentLap();completeLap();expect(useLapGhostStore.getState().record).toBeNull();});
  it('excludes teleporting laps',()=>{tick();object.position.z=500;useRacingStore.getState().updateTimer(.2);frames[0]();completeLap();expect(useLapGhostStore.getState().record).toBeNull();});
  it('a paused race resumes without adding wall-clock time to the replay',()=>{for(let i=0;i<5;i++)tick();useGameStore.setState({gameState:'paused'});for(let i=0;i<50;i++)frames[0]();useGameStore.setState({gameState:'playing'});completeLap();expect(useLapGhostStore.getState().record?.duration).toBeCloseTo(count);});
  it('hidden-tab discontinuities cannot produce a saved replay',()=>{vi.stubGlobal('document',{hidden:true});tick();vi.stubGlobal('document',{hidden:false});completeLap();expect(useLapGhostStore.getState().record).toBeNull();});
  it('spectators never create replay records',()=>{useMultiplayerStore.setState({isSpectating:true});tick();completeLap();expect(useLapGhostStore.getState().record).toBeNull();});
  it('resetting records also clears the ghost but preserves other progress',()=>{completeLap();values.set('road_mastery','keep');useRacingStore.getState().resetAllTrackRecords();expect(useLapGhostStore.getState().record).toBeNull();expect(values.get('road_mastery')).toBe('keep');expect(Array.from(values.keys()).some(k=>k.startsWith('aeroline_ghost_'))).toBe(false);});
  it('storage quota denial still keeps a usable session ghost',()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('quota');}});completeLap();expect(useLapGhostStore.getState().record).not.toBeNull();expect(useLapGhostStore.getState().message).toContain('this session');});
});
