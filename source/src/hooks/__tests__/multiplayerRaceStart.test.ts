import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {EffectCallback} from 'react';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import {useRacingStore} from '@/store/racingStore';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerRaceStart} from '../useMultiplayerRaceStart';
import type {RaceStartState} from '@/types/network';
const {cleanups} = vi.hoisted(()=>({cleanups: [] as (()=>void)[]}));
vi.mock('react', async original => ({...await original<typeof import('react')>(),
  useEffect: (effect: EffectCallback) => {const cleanup=effect(); if(cleanup) cleanups.push(cleanup);}}));
vi.mock('@/utils/countdownSound',()=>({playCountdownBeep:vi.fn()}));
const waiting: RaceStartState={phase:'waiting',round:1,startAt:null,memberIds:['a','b','c'],readyIds:['a','b','c'],votedIds:[],racerIds:[],requiredVotes:2};
beforeEach(()=>{
  vi.useFakeTimers(); vi.setSystemTime(100000);
  useMultiplayerStore.getState().reset(); useRacingStore.getState().resetRace();
  useGameStore.setState({gameMode:'timeattack',gameState:'playing'});
  useMultiplayerStore.getState().setSelfId('a','Test',0,{id:'ABC123',name:'Test',hostId:'a',hostNickname:'Host',levelId:'level6_gymkhana_harbor',gameMode:'timeattack',playerCount:3,maxPlayers:12,createdAt:100000});
  useMultiplayerStore.getState().setRaceStart(waiting);
});
afterEach(()=>{for(const cleanup of cleanups) cleanup(); cleanups.length=0; vi.useRealTimers();});
describe('Actual client race lifecycle orchestration',()=>{
  it('stops a finisher once and releases everyone on the next shared grid',()=>{
    useMultiplayerRaceStart();
    const startAt=Date.now()-1000;
    useMultiplayerStore.getState().setRaceStart({...waiting,phase:'racing',startAt,racerIds:['a','b','c']});
    useMultiplayerStore.getState().setRaceRound({round:1,startAt,deadlineAt:startAt+34000,phase:'racing',totalCheckpoints:4,standings:[{id:'a',nickname:'Test',vehicleId:'stradale_gt',status:'finished',reason:null,finishMs:4000,completedCheckpoints:4}]});
    expect(useRacingStore.getState().raceStatus).toBe('completed');
    vi.advanceTimersByTime(5000);expect(useRacingStore.getState().raceStatus).toBe('completed');
    useMultiplayerStore.getState().setRaceStart({...waiting,round:2});
    expect(useRacingStore.getState().raceStatus).toBe('idle');expect(useMultiplayerStore.getState().isSpectating).toBe(false);
  });
  it('stays idle on the grid, then shares GO without being restarted by roster or ping updates',()=>{
    useMultiplayerRaceStart(); vi.advanceTimersByTime(10000);
    expect(useRacingStore.getState().raceStatus).toBe('idle');
    const startAt=Date.now()+3000;
    useMultiplayerStore.getState().setRaceStart({...waiting,phase:'countdown',startAt,racerIds:['a','b','c']});
    expect(useRacingStore.getState().countdown).toBe(3);
    vi.advanceTimersByTime(2000); expect(useRacingStore.getState().countdown).toBe(1);
    vi.advanceTimersByTime(1000); expect(useRacingStore.getState().raceStatus).toBe('racing');
    useRacingStore.setState({currentCheckpoint:4,currentLapTime:15});
    useMultiplayerStore.getState().updatePing(20);
    useMultiplayerStore.getState().setRaceStart({...waiting,phase:'racing',startAt,racerIds:['a','b','c']});
    expect(useRacingStore.getState().currentCheckpoint).toBe(4);
    expect(useRacingStore.getState().currentLapTime).toBe(15);
    useMultiplayerStore.getState().setRaceStart({...waiting,round:2});
    expect(useRacingStore.getState().raceStatus).toBe('idle');
    expect(useRacingStore.getState().currentLapTime).toBe(0);
  });
  it('never starts a late joiner, then releases them for the next grid',()=>{
    useMultiplayerRaceStart();
    useMultiplayerStore.getState().setRaceStart({...waiting,phase:'racing',startAt:99000,racerIds:['b','c']});
    expect(useMultiplayerStore.getState().isSpectating).toBe(true);
    expect(useRacingStore.getState().raceStatus).toBe('idle');
    useMultiplayerStore.getState().setRaceStart({...waiting,round:2});
    expect(useMultiplayerStore.getState().isSpectating).toBe(false);
  });
  it('catches up a delayed GO packet instead of making a new three-second countdown',()=>{
    useMultiplayerRaceStart();
    useMultiplayerStore.getState().setRaceStart({...waiting,phase:'racing',startAt:98000,racerIds:['a','b','c']});
    expect(useRacingStore.getState().raceStatus).toBe('racing');
    expect(useRacingStore.getState().currentLapTime).toBe(2);
    expect(useRacingStore.getState().countdown).toBeNull();
  });
});
