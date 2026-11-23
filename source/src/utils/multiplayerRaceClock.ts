import type { RaceStartState } from '@/types/network';

/** Lock the physical car until the authoritative GO epoch; late joiners never enter a running race. */
export function isRaceGridLocked(state: RaceStartState | null, selfId: string | null, serverNow: number): boolean {
  if (!state || !selfId || state.phase === 'waiting' || state.phase==='results') return true;
  if (!state.racerIds.includes(selfId) || state.startAt === null) return true;
  return serverNow < state.startAt;
}

/** Shared countdown digit; zero is GO, independent of rendering FPS or packet delivery delay. */
export function raceCountdownDigit(startAt: number, serverNow: number): number {
  return Math.max(0, Math.min(3, Math.ceil((startAt - serverNow) / 1000)));
}
