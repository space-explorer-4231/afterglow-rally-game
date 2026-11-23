import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {useGameStore} from '@/store/gameStore';

import {isIOS} from '@/utils/device';
import {warmRenderer} from '@/utils/rendererWarmup';
/** Renderer readiness is independent of physics settling; compilation remains behind the loader. */
export function ShaderWarmUp():null {
 const gl=useThree(s=>s.gl),scene=useThree(s=>s.scene),camera=useThree(s=>s.camera);
 const map=useGameStore(s=>s.selectedLevelId),car=useGameStore(s=>s.selectedVehicleId);
 const ready=useGameStore(s=>s.isRenderReady),visual=useGameStore(s=>s.isVehicleVisualReady);

 useEffect(()=>{
  if(ready||!visual)return;
  // iOS retains on-demand compilation to avoid its full-scene Metal watchdog failure.
  return warmRenderer(()=>isIOS()?Promise.resolve():gl.compileAsync(scene,camera),requestAnimationFrame,cancelAnimationFrame,
   ()=>useGameStore.setState({isRenderReady:true}),error=>console.warn('[ShaderWarmUp] Async compilation fallback:',error));
 },[gl,scene,camera,map,car,ready,visual]);
 return null;
}

