import {beforeAll,afterEach,beforeEach,it,expect,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {useVehiclePhysics} from '../useVehiclePhysics';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {getLevelPreset} from '@/config/levelRegistry';
import {getVehiclePreset} from '@/config/vehicleRegistry';
import {compileTerrain} from '@/utils/terrainCompiler';
import type {EffectCallback} from 'react';
const harness=vi.hoisted(()=>({frames:[] as ((state:unknown,delta:number)=>void)[],effects:[] as EffectCallback[],terrain:null as unknown,world:null as unknown,rapier:null as unknown}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useRef:<T,>(current:T)=>({current}),useEffect:(effect:EffectCallback)=>{harness.effects.push(effect);}}));
vi.mock('@react-three/fiber',()=>({useFrame:(frame:(state:unknown,delta:number)=>void)=>harness.frames.push(frame)}));
vi.mock('@react-three/rapier',()=>({useRapier:()=>({world:harness.world,rapier:harness.rapier}),useBeforePhysicsStep:()=>{}}));
vi.mock('@/components/terrain/TerrainContext',()=>({useTerrainData:()=>harness.terrain}));
vi.mock('../useInput',()=>({useInputUpdater:()=>()=>({steering:0,throttle:0,brake:0,handbrake:false,cameraToggle:false,reset:false})}));
let world:RAPIER.World,cleanups:(()=>void)[]=[];
beforeAll(async()=>{await RAPIER.init();});
beforeEach(()=>{
 harness.frames.length=0;harness.effects.length=0;cleanups=[];
 const preset=getLevelPreset('level6_gymkhana_harbor');const data={...preset.data,terrainBase:{...preset.data.terrainBase,subdivisions:16}};
 harness.terrain={levelPreset:preset,levelData:data,heightmapData:compileTerrain(data)};
 world=new RAPIER.World({x:0,y:-9.81,z:0});harness.world=world;harness.rapier=RAPIER;
 useMultiplayerStore.getState().reset();useGameStore.setState({gameState:'title',loadingTarget:'menu',isSceneReady:false,pendingReset:false,gameMode:'freeroam'});
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());world.createCollider(RAPIER.ColliderDesc.cuboid(1,.4,2),body);
 useVehiclePhysics({current:body},{current:[]},getVehiclePreset('bmw_m3_drift').config);
 for(const effect of harness.effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}
});
afterEach(()=>{for(const cleanup of cleanups)cleanup();world.free();});
function tick(){for(const frame of harness.frames)frame({},1/30);}
it('completes scene readiness when title enters menu loading instead of resetting every frame',()=>{
 tick();tick();expect(useGameStore.getState().isSceneReady).toBe(true);
 useGameStore.setState({gameState:'loading',loadingTarget:'menu',isSceneReady:false});
 for(let i=0;i<4;i++)tick();expect(useGameStore.getState().isSceneReady).toBe(true);
});
it('restores readiness after returning from gameplay and permits another gameplay load',()=>{
 tick();tick();useGameStore.setState({gameState:'paused'});
 useGameStore.getState().setGameState('menu');tick();tick();expect(useGameStore.getState().isSceneReady).toBe(true);
 useGameStore.setState({gameState:'loading',loadingTarget:'gameplay',isSceneReady:false,pendingReset:true});
 for(let i=0;i<18;i++)tick();expect(useGameStore.getState().isSceneReady).toBe(true);
});
