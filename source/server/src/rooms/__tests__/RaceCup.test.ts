import {describe,it,expect} from 'vitest';
import {RaceCup} from '../RaceCup.js';
import type {RaceRoundState,RaceStanding} from '../../types.js';
const driver=(id:string,finished=true,ms=5000):RaceStanding=>({id,nickname:id,vehicleId:'zephyr_wr4',
  status:finished?'finished':'dnf',reason:finished?null:'left',finishMs:finished?ms:null,completedCheckpoints:finished?4:0});
const round=(number:number,standings:RaceStanding[],phase:'racing'|'results'='results'):RaceRoundState=>({round:number,startAt:1000,deadlineAt:31000,phase,totalCheckpoints:4,standings});
describe('room Club Cup authority and bounded history',()=>{
  it('awards points exactly once, with no credit for DNF',()=>{
    const cup=new RaceCup(),result=round(1,[driver('a'),driver('b'),driver('c',false)]);
    cup.complete(result);cup.complete(result);
    expect(cup.snapshot([]).completed).toBe(1);
    expect(cup.snapshot([]).standings.map(row=>row.points)).toEqual([12,10,0]);
  });
  it('does not score a live or manually abandoned round',()=>{
    const cup=new RaceCup();cup.complete(round(1,[driver('a')],'racing'));cup.begin();
    expect(cup.snapshot([driver('a')]).completed).toBe(0);expect(cup.snapshot([]).standings).toEqual([]);
    cup.complete(round(2,[driver('a')]));expect(cup.snapshot([]).completed).toBe(1);
  });
  it('carries points for three races and resets only when the next Cup begins',()=>{
    const cup=new RaceCup();
    for(let i=1;i<=3;i++){cup.begin();cup.complete(round(i,[driver('a'),driver('b')]));}
    expect(cup.snapshot([])).toMatchObject({number:1,race:3,completed:3,championId:'a'});
    expect(cup.snapshot([]).standings[0].points).toBe(36);
    cup.begin();expect(cup.snapshot([driver('b')])).toMatchObject({number:2,race:1,completed:0,championId:null});
    expect(cup.snapshot([driver('b')]).standings[0].points).toBe(0);
    cup.complete(round(4,[driver('b')]));expect(cup.snapshot([]).standings[0].points).toBe(12);
  });
  it('retains departed scores and allows late arrivals to score remaining races',()=>{
    const cup=new RaceCup();cup.complete(round(1,[driver('a')]));cup.begin();cup.complete(round(2,[driver('b')]));
    expect(cup.snapshot([]).standings.map(row=>row.id).sort()).toEqual(['a','b']);
    expect(cup.snapshot([]).standings.find(row=>row.id==='a')?.lastPoints).toBe(0);
  });
  it('breaks equal scores by wins, finishes, total time, then stable session ID',()=>{
    const cup=new RaceCup();cup.complete(round(1,[driver('b',true,5000),driver('a',true,6000)]));
    cup.complete(round(2,[driver('a',true,4000),driver('b',true,6000)]));
    expect(cup.snapshot([]).standings[0].id).toBe('a');
  });
  it('does not crown an all-DNF champion',()=>{
    const cup=new RaceCup();for(let i=1;i<=3;i++)cup.complete(round(i,[driver('a',false)]));
    expect(cup.snapshot([]).championId).toBeNull();
  });
  it('bounds history to three twelve-driver fields and never stores aborted rosters',()=>{
    const cup=new RaceCup();for(let i=0;i<1000;i++)cup.snapshot([driver('aborted'+i)]);
    expect(cup.snapshot([]).standings).toHaveLength(0);
    for(let i=1;i<=3;i++)cup.complete(round(i,Array.from({length:12},(_,j)=>driver(`${i}-${j}`))));
    expect(cup.snapshot([]).standings).toHaveLength(36);cup.begin();expect(cup.snapshot([]).standings).toHaveLength(0);
  });
  it('returns detached snapshots and ignores stale replayed rounds',()=>{
    const cup=new RaceCup();cup.complete(round(2,[driver('a')]));cup.complete(round(1,[driver('b')]));
    cup.snapshot([]).standings[0].points=999;
    expect(cup.snapshot([]).standings[0].points).toBe(12);expect(cup.snapshot([]).completed).toBe(1);
  });
});
