import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {useInputUpdater} from '../useInput';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
const lifecycle=vi.hoisted(()=>({effects:[] as (()=>void|(()=>void))[]}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(effect:()=>void|(()=>void))=>{lifecycle.effects.push(effect);},useCallback:<T,>(callback:T)=>callback,useRef:<T,>(current:T)=>({current}),useSyncExternalStore:<T,>(_subscribe:unknown,snapshot:()=>T)=>snapshot(),useDebugValue:()=>{}}));
vi.mock('@/store/gameStore',async original=>{
 const actual=await original<typeof import('@/store/gameStore')>(),store=actual.useGameStore;
 return {...actual,useGameStore:Object.assign((selector:(state:ReturnType<typeof store.getState>)=>unknown)=>selector(store.getState()),store)};
});
let target:EventTarget,doc:EventTarget & {activeElement:null;hidden:boolean},cleanups:(()=>void)[]=[],now=100;
beforeEach(()=>{
 lifecycle.effects.length=0;cleanups=[];now=100;target=new EventTarget();doc=Object.assign(new EventTarget(),{activeElement:null,hidden:false});vi.stubGlobal('window',target);vi.stubGlobal('document',doc);vi.stubGlobal('navigator',{getGamepads:()=>[]});vi.spyOn(performance,'now').mockImplementation(()=>now);
 useMultiplayerStore.getState().reset();useGameStore.setState({gameState:'playing',gameMode:'freeroam',isGarageOpen:false,recoveryCountdown:0});
});
afterEach(()=>{for(const cleanup of cleanups)cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function key(type:string,code:string):void {const event=new Event(type);Object.defineProperties(event,{code:{value:code},repeat:{value:false}});target.dispatchEvent(event);}
it.each(['ShiftLeft','ShiftRight'])('captures a %s tap entirely between simulation samples',code=>{
 const sample=useInputUpdater();for(const effect of lifecycle.effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}
 key('keydown',code);now=105;key('keyup',code);now=110;expect(sample(1/60).nitro).toBe(true);now=221;expect(sample(1/60).nitro).toBe(false);
});
it('cancels a queued boost tap when focus is lost',()=>{const sample=useInputUpdater();for(const effect of lifecycle.effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}key('keydown','ShiftLeft');target.dispatchEvent(new Event('blur'));expect(sample(1/60).nitro).toBe(false);});
it('releases throttle and boost when a tab hides without delivering keyup',()=>{
 const sample=useInputUpdater();for(const effect of lifecycle.effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}
 key('keydown','KeyW');key('keydown','ShiftLeft');expect(sample(1/60).throttle).toBe(1);expect(sample(1/60).nitro).toBe(true);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));doc.hidden=false;
 expect(sample(1/60).throttle).toBe(0);expect(sample(1/60).nitro).toBe(false);
});

