import {describe, it, expect} from 'vitest';
import {isRaceGridLocked, raceCountdownDigit} from '../multiplayerRaceClock';
import type {RaceStartState} from '@/types/network';
const state: RaceStartState = {phase:'countdown',round:1,startAt:4000,memberIds:['a','b'],readyIds:['a','b'],votedIds:[],racerIds:['a'],requiredVotes:2};
describe('Race GO is a server clock, not a local frame counter', () => {
  it('locks missing, loading, waiting and late-joining clients', () => {
    expect(isRaceGridLocked(null,'a',10000)).toBe(true);
    expect(isRaceGridLocked({...state,phase:'waiting',startAt:null},'a',10000)).toBe(true);
    expect(isRaceGridLocked(state,null,10000)).toBe(true);
    expect(isRaceGridLocked({...state,phase:'racing'},'b',10000)).toBe(true);
  });
  it('releases cohort cars at exactly the same GO epoch, even if the racing packet is late', () => {
    expect(isRaceGridLocked(state,'a',3999)).toBe(true);
    expect(isRaceGridLocked(state,'a',4000)).toBe(false);
    expect(isRaceGridLocked(state,'a',6000)).toBe(false);
  });
  it('skips missed countdown digits instead of extending a late client countdown', () => {
    expect(raceCountdownDigit(4000,1000)).toBe(3);
    expect(raceCountdownDigit(4000,2300)).toBe(2);
    expect(raceCountdownDigit(4000,3999)).toBe(1);
    expect(raceCountdownDigit(4000,4500)).toBe(0);
  });
});
