import {describe,it,expect} from 'vitest';
import {checkpointNitroFraction,createNitroState,rewardNitro,NITRO_TOTAL_SECONDS} from '../nitro';
import {useRacingStore} from '@/store/racingStore';
import {onGameEvent} from '@/utils/events';
describe('Checkpoint NOS rewards',()=>{
 it('adds 35% of both tanks, fully refills midpoint/finish, and clamps overflow',()=>{
  const state=createNitroState();state.remaining=0;rewardNitro(state,checkpointNitroFraction(1,8));expect(state.remaining).toBe(3.5);
  rewardNitro(state,checkpointNitroFraction(4,8));expect(state.remaining).toBe(NITRO_TOTAL_SECONDS);
  state.remaining=.1;rewardNitro(state,checkpointNitroFraction(0,8));expect(state.remaining).toBe(10);
  rewardNitro(state,NaN);expect(state.remaining).toBe(10);expect(checkpointNitroFraction(3,5)).toBe(1);
 });
 it('credits only sequential gates once, including one midpoint and one finish per lap',()=>{
  useRacingStore.setState({raceStatus:'racing',currentCheckpoint:1,totalCheckpoints:4,currentLapTime:20,lapCount:0});
  const state=createNitroState();state.remaining=0;const rewards:number[]=[];
  const stop=onGameEvent('checkpoint_passed',e=>{const fraction=checkpointNitroFraction(e.checkpointIndex,e.totalCheckpoints);rewards.push(fraction);rewardNitro(state,fraction);});
  const pass=useRacingStore.getState().passCheckpoint;
  try{pass(3);expect(state.remaining).toBe(0);pass(1);pass(1);expect(state.remaining).toBe(3.5);pass(2);expect(state.remaining).toBe(10);state.remaining=0;pass(3);pass(0);pass(0);expect(rewards).toEqual([.35,1,.35,1]);expect(state.remaining).toBe(10);}finally{stop();useRacingStore.getState().resetRace();}
 });
});
