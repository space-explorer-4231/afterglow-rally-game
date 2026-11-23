import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSettingsStore } from '@/store/settingsStore';
import {useGameStore} from '@/store/gameStore';
import { updateResolutionGovernor, type ResolutionGovernorState } from '@/utils/resolutionGovernor';

/** Slow, bounded resolution adaptation rather than per-frame DPR toggling. */
export function StableResolution() {
  const setDpr = useThree(s => s.setDpr);
  const initialDpr = useThree(s => s.viewport.initialDpr);
  const targetFps = useSettingsStore(s => s.targetFps);
  const sample = useRef<ResolutionGovernorState>({scale:1,slowSeconds:0,fastSeconds:0});
  const lastTime = useRef(0);
  useEffect(() => {
    sample.current.scale = 1; sample.current.slowSeconds = 0; sample.current.fastSeconds = 0; sample.current.sampleSeconds = 0; sample.current.sampleFrames = 0;
    lastTime.current = 0;
    return () => setDpr(initialDpr);
  }, [initialDpr,setDpr,targetFps]);
  useFrame(() => {
    const game=useGameStore.getState();
    // Menu/pause frame caps and loading work are deliberate, not GPU overload.
    if(game.gameState!=='playing'||!game.isSceneReady||game.isGarageOpen||document.hidden){
      lastTime.current=0;sample.current.slowSeconds=0;sample.current.fastSeconds=0;
      sample.current.sampleSeconds=0;sample.current.sampleFrames=0;return;
    }
    const now = performance.now();
    if (lastTime.current > 0) {
      const before = sample.current.scale;
      const scale = updateResolutionGovernor(sample.current, (now-lastTime.current)/1000, targetFps);
      if (scale !== before) setDpr(initialDpr * scale);
    }
    lastTime.current = now;
  });
  return null;
}
