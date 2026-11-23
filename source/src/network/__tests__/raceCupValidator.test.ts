import {describe,it,expect} from 'vitest';
import {parseRaceCup} from '../raceCupValidator';
import {parseRaceRound} from '../raceRoundValidator';
const entry={id:'a',nickname:'Driver',points:12,wins:1,finishes:1,totalMs:4000,lastPoints:12};
const cup={number:1,race:1,completed:1,totalRaces:3,championId:null,standings:[entry]};
describe('Club Cup network boundary',()=>{
  it('accepts a shared score and preserves it through the race packet parser',()=>{
    expect(parseRaceCup(cup)).toEqual(cup);
    const round={round:1,startAt:100000,deadlineAt:134000,phase:'results',totalCheckpoints:4,
      standings:[{id:'a',nickname:'Driver',vehicleId:'zephyr_wr4',status:'finished',reason:null,finishMs:4000,completedCheckpoints:4}],cup};
    expect(parseRaceRound(round)?.cup).toEqual(cup);
    expect(parseRaceRound({...round,cup:{...cup,championId:'a'}})).toBeNull();
  });
  it.each([
    null,{}, {...cup,number:0},{...cup,race:4},{...cup,completed:4},{...cup,totalRaces:5},
    {...cup,standings:[]},{...cup,standings:Array(37).fill(entry)}, {...cup,standings:[entry,entry]},
    {...cup,championId:'a'},{...cup,standings:[{...entry,points:Infinity}]},
    {...cup,standings:[{...entry,points:37}]},{...cup,standings:[{...entry,lastPoints:13}]},
    {...cup,standings:[{...entry,wins:2}]},{...cup,standings:[{...entry,finishes:2}]},
    {...cup,standings:[{...entry,totalMs:-1}]},{...cup,standings:[{...entry,totalMs:600001}]},
    {...cup,standings:[{...entry,nickname:'a'.repeat(33)}]},
  ])('rejects malformed championship %#',raw=>expect(parseRaceCup(raw)).toBeNull());
  it('accepts a final champion, but rejects missing or invented winners',()=>{
    const final={...cup,race:3,completed:3,championId:'a'};
    expect(parseRaceCup(final)).toEqual(final);
    expect(parseRaceCup({...final,championId:'b'})).toBeNull();
    expect(parseRaceCup({...final,championId:null})).toBeNull();
  });
});
