import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {renderToString} from 'react-dom/server';
import {HUD} from '../HUD';
import {useGameStore} from '@/store/gameStore';
import {useMultiplayerStore} from '@/store/multiplayerStore';
import type {RaceStartState,RaceRoundState} from '@/types/network';
import {RaceCupTable} from '../RaceCupTable';
// Zustand's server snapshot is its initial state; render these client screens at their live state.
vi.mock('@/store/gameStore',async original=>{
  const actual=await original<typeof import('@/store/gameStore')>(),store=actual.useGameStore;
  return {...actual,useGameStore:Object.assign((selector:(state:ReturnType<typeof store.getState>)=>unknown)=>selector(store.getState()),store)};
});
vi.mock('@/store/multiplayerStore',async original=>{
  const actual=await original<typeof import('@/store/multiplayerStore')>(),store=actual.useMultiplayerStore;
  return {...actual,useMultiplayerStore:Object.assign((selector:(state:ReturnType<typeof store.getState>)=>unknown)=>selector(store.getState()),store)};
});
const start:RaceStartState={phase:'racing',round:1,startAt:100000,memberIds:['a','b'],readyIds:['a','b'],votedIds:[],racerIds:['a','b'],requiredVotes:2};
const round:RaceRoundState={round:1,startAt:100000,deadlineAt:700000,phase:'racing',totalCheckpoints:4,standings:[
  {id:'a',nickname:'Host',vehicleId:'stradale_gt',status:'racing',reason:null,finishMs:null,completedCheckpoints:1},
  {id:'b',nickname:'Friend',vehicleId:'stradale_gt',status:'racing',reason:null,finishMs:null,completedCheckpoints:0},
]};
beforeEach(()=>{
  useMultiplayerStore.getState().reset();useGameStore.setState({gameState:'playing',gameMode:'timeattack',isSceneReady:true});
  useMultiplayerStore.getState().setSelfId('a','Room',0,{id:'ABC123',name:'Friends Race',hostId:'a',hostNickname:'Host',levelId:'level6_gymkhana_harbor',gameMode:'timeattack',playerCount:2,maxPlayers:12,createdAt:0});
  useMultiplayerStore.getState().setRaceStart(start);useMultiplayerStore.getState().setRaceRound(round);
});
afterEach(()=>useMultiplayerStore.getState().reset());
describe('race screen priority and readable controls',()=>{
  it('keeps personal points visible and pages large Cup fields with selectable controls',()=>{
    const standings=Array.from({length:12},(_,i)=>({id:String(i),nickname:'Cup Driver '+i,points:12-i,wins:i===0?1:0,finishes:1,totalMs:4000+i,lastPoints:12-i}));
    const html=renderToString(<RaceCupTable self="11" cup={{number:1,race:1,completed:1,totalRaces:3,championId:null,standings}}/>);
    expect(html).toContain('Your Cup: #');expect(html).toContain('12');expect(html).toContain('Next standings');
    expect(html.match(/class="race-cup-place"/g)).toHaveLength(6);expect(html).toContain('data-race-control="true"');
  });
  it('the lobby does not stack gauges, tuning, ghost or live standings beneath its controls',()=>{
    useMultiplayerStore.getState().setRaceStart({...start,phase:'waiting',startAt:null,racerIds:[]});
    const html=renderToString(<HUD/>);expect(html).toContain('Multiplayer starting grid');expect(html).toContain('data-race-panel="true"');
    for(const hidden of ['id="rally-cluster"','class="drive-console"','PERSONAL BEST GHOST','Shared checkpoint standings'])expect(html).not.toContain(hidden);
  });
  it('racing shows the shared field and driving controls, without an automatic guide or solo ghost panel',()=>{
    const html=renderToString(<HUD/>);expect(html).toContain('Shared checkpoint standings');expect(html).toContain('class="drive-console"');expect(html).toContain('id="rally-cluster"');
    expect(html).not.toContain('First drive guide');expect(html).not.toContain('PERSONAL BEST GHOST');expect(html).not.toContain('DRIFT PRACTICE');
  });
  it('a finished driver gets one clear results panel instead of the active driving widgets',()=>{
    useMultiplayerStore.getState().setRaceRound({...round,phase:'results',standings:round.standings.map((driver,i)=>({...driver,status:'finished',completedCheckpoints:4,finishMs:4000+i*1000}))});
    useMultiplayerStore.getState().setRaceStart({...start,phase:'results'});
    const html=renderToString(<HUD/>);expect(html).toContain('Shared race results');expect(html).toContain('Race again now');expect(html).toContain('Next race starts automatically');expect(html).not.toContain('id="rally-cluster"');expect(html).not.toContain('class="drive-console"');
  });
  it('shows the Cup chase while driving and a shared champion table after race three',()=>{
    const cup={number:2,race:2,completed:1,totalRaces:3 as const,championId:null,standings:[
      {id:'b',nickname:'Friend',points:12,wins:1,finishes:1,totalMs:4000,lastPoints:12},
      {id:'a',nickname:'Host',points:10,wins:0,finishes:1,totalMs:5000,lastPoints:10},
    ]};
    useMultiplayerStore.getState().setRaceRound({...round,cup});
    let html=renderToString(<HUD/>);expect(html).toContain('CLUB CUP 2 / RACE 2 OF 3');expect(html).toContain('2 to lead');
    useMultiplayerStore.getState().setRaceRound({...round,phase:'results',cup:{...cup,race:3,completed:3,championId:'b'}});
    useMultiplayerStore.getState().setRaceStart({...start,phase:'results'});
    html=renderToString(<HUD/>);expect(html).toContain('Friend takes the Cup!');expect(html).toContain('FINAL CUP STANDINGS');
    expect(html).toContain('Start next Cup now');expect(html).toContain('DNF earns 0');expect(html).not.toContain('id="rally-cluster"');
  });
});
