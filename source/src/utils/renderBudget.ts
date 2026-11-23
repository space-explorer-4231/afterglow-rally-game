import type { GameState } from '@/types/game';

/** Presentation budget only; Rapier continues to use its fixed 60 Hz timestep. */
export function getRenderBudget(state: GameState, visible: boolean, garageOpen: boolean, targetFps: number) {
  return {
    enabled: visible && !garageOpen,
    targetFps: state === 'playing' ? targetFps : state === 'paused' ? 10 : Math.min(targetFps, 30),
  };
}
