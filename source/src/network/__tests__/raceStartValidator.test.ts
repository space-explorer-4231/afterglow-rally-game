import {describe, it, expect} from 'vitest';
import {parseRaceStartState} from '../raceStartValidator';
import {parseClientMessage, parseServerMessage} from '../packetValidator';
const waiting = {phase:'waiting',round:1,startAt:null,memberIds:['a','b','c'],readyIds:['a','b','c'],votedIds:['a'],racerIds:[],requiredVotes:2};
describe('Race gate packet boundaries', () => {
  it('accepts host controls and explicit boolean ballots', () => {
    expect(parseClientMessage({type:'race_start'})).toEqual({type:'race_start'});
    expect(parseClientMessage({type:'race_reset'})).toEqual({type:'race_reset'});
    expect(parseClientMessage({type:'race_vote',voted:false})).toEqual({type:'race_vote',voted:false});
    expect(parseClientMessage({type:'race_vote',voted:1})).toBeNull();
  });
  it('accepts a legitimate waiting grid and an authoritative countdown', () => {
    expect(parseRaceStartState(waiting)).toEqual(waiting);
    const state={...waiting,phase:'countdown',startAt:Date.now()+3000,racerIds:['a','b','c']};
    expect(parseServerMessage({type:'race_state',roomId:'ABC123',hostId:'a',hostNickname:'Host',serverTime:Date.now(),state})?.type).toBe('race_state');
  });
  it.each([
    {...waiting,requiredVotes:1}, {...waiting,votedIds:['a','a']}, {...waiting,readyIds:['outsider']},
    {...waiting,votedIds:['outsider']}, {...waiting,memberIds:['a','b'],readyIds:['a','b'],requiredVotes:2},
    {...waiting,phase:'countdown',startAt:Infinity,racerIds:['a']}, {...waiting,phase:'racing',startAt:1,racerIds:[]},
    {...waiting,round:-1}, {...waiting,round:1.2}, {...waiting,phase:'waiting',startAt:42},
  ])('rejects malformed or forged lifecycle data %#', value => {
    expect(parseRaceStartState(value)).toBeNull();
  });
});
