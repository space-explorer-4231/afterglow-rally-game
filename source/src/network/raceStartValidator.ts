import type { RaceStartState } from '@/types/network';

/** Validate lifecycle packets before they can unlock a car or change the shared race clock. */
export function parseRaceStartState(raw: unknown): RaceStartState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (value.phase !== 'waiting' && value.phase !== 'countdown' && value.phase !== 'racing' && value.phase !== 'results') return null;
  if (typeof value.round !== 'number' || !Number.isInteger(value.round) || value.round < 1 || value.round > 1e9) return null;
  const ids = (list: unknown): list is string[] => Array.isArray(list) && list.length <= 12 &&
    list.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64) && new Set(list).size === list.length;
  if (!ids(value.memberIds) || !ids(value.readyIds) || !ids(value.votedIds) || !ids(value.racerIds)) return null;
  const {memberIds, readyIds, votedIds, racerIds} = value;
  if (!readyIds.every(id => memberIds.includes(id)) ||
      !votedIds.every(id => readyIds.includes(id)) ||
      !racerIds.every(id => memberIds.includes(id))) return null;
  if (value.requiredVotes !== Math.floor(value.memberIds.length / 2) + 1) return null;
  if (value.phase === 'waiting') {
    if (value.startAt !== null || value.racerIds.length !== 0 || (value.memberIds.length < 3 && value.votedIds.length > 0)) return null;
  } else if (typeof value.startAt !== 'number' || !Number.isFinite(value.startAt) || value.startAt < 0 || value.startAt > 1e15 || value.racerIds.length === 0) {
    return null;
  }
  return {phase: value.phase, round: value.round, startAt: value.startAt as number | null,
    memberIds: value.memberIds, readyIds: value.readyIds, votedIds: value.votedIds,
    racerIds: value.racerIds, requiredVotes: value.requiredVotes};
}
