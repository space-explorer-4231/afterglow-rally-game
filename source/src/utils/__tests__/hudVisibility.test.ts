import {describe,it,expect} from 'vitest';
import {isSharedRacePanelOpen} from '../hudVisibility';
import type {RaceStartState,RaceRoundState} from '@/types/network';
const start:RaceStartState={phase:'racing',round:2,startAt:100,memberIds:['a','b'],readyIds:['a','b'],votedIds:[],racerIds:['a','b'],requiredVotes:2};
const round:RaceRoundState={phase:'racing',round:2,startAt:100,deadlineAt:100000,totalCheckpoints:4,standings:[{id:'a',nickname:'A',vehicleId:'stradale_gt',status:'finished',reason:null,finishMs:5000,completedCheckpoints:4}]};
describe('exclusive shared race screens',()=>{
  it('keeps driving widgets out of the loading grid and final result panel',()=>{expect(isSharedRacePanelOpen('timeattack',{...start,phase:'waiting'},null,'a')).toBe(true);expect(isSharedRacePanelOpen('timeattack',{...start,phase:'results'},round,'b')).toBe(true);});
  it('shows driving widgets for an active driver and hides them for a finisher',()=>{expect(isSharedRacePanelOpen('timeattack',start,round,'a')).toBe(true);expect(isSharedRacePanelOpen('timeattack',start,round,'b')).toBe(false);});
  it('does not let stale results or another game mode hide the dashboard',()=>{expect(isSharedRacePanelOpen('timeattack',start,{...round,round:1},'a')).toBe(false);expect(isSharedRacePanelOpen('freeroam',start,round,'a')).toBe(false);expect(isSharedRacePanelOpen(undefined,null,null,'a')).toBe(false);});
});
