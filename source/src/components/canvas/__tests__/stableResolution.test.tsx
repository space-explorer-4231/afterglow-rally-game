import {afterEach,expect,it,vi} from 'vitest';
import {useGameStore} from '@/store/gameStore';
const mock=vi.hoisted(()=>({frame:undefined as (()=>void)|undefined,setDpr:vi.fn(),cleanup:undefined as (()=>void)|undefined}));
vi.mock('react',()=>({useRef:<T,>(value:T)=>({current:value}),useEffect:(effect:()=>void|(()=>void))=>{mock.cleanup=effect()||undefined;}}));
vi.mock('@react-three/fiber',()=>({useFrame:(callback:()=>void)=>{mock.frame=callback;},useThree:(select:(value:{setDpr:(dpr:number)=>void;viewport:{initialDpr:number}})=>unknown)=>select({setDpr:mock.setDpr,viewport:{initialDpr:1}})}));
vi.mock('@/store/settingsStore',()=>({useSettingsStore:(select:(value:{targetFps:60})=>unknown)=>select({targetFps:60})}));
import {StableResolution} from '../StableResolution';
afterEach(()=>{mock.cleanup?.();mock.cleanup=undefined;vi.restoreAllMocks();vi.unstubAllGlobals();});
it('does not treat deliberate pause/menu caps or scene loading as GPU overload',()=>{
 let now=1000;vi.spyOn(performance,'now').mockImplementation(()=>now);vi.stubGlobal('document',{hidden:false});
 StableResolution();mock.setDpr.mockClear();
 for(const phase of ['paused','menu','loading'] as const){
  useGameStore.setState({gameState:phase,isSceneReady:true,isGarageOpen:false});
  for(let i=0;i<100;i++){now+=100;mock.frame?.();}
 }
 expect(mock.setDpr).not.toHaveBeenCalled();
 useGameStore.setState({gameState:'playing',isSceneReady:true});
 for(let i=0;i<42;i++){now+=50;mock.frame?.();}
 expect(mock.setDpr).toHaveBeenCalledWith(.9);
});
