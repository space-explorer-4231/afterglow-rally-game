import {describe,it,expect} from 'vitest';
import {parseRaceRound} from '../raceRoundValidator';
import {parseServerMessage} from '../packetValidator';
import {RACE_COURSES} from '../../../server/src/raceCourses';
import {LEVEL_REGISTRY} from '@/config/levelRegistry';
const driver={id:'a',nickname:'Driver A',vehicleId:'stradale_gt',status:'finished',reason:null,finishMs:4000,completedCheckpoints:4};
const results={round:1,startAt:100000,deadlineAt:134000,phase:'results',totalCheckpoints:4,standings:[driver]};
describe('race progress/result packet boundaries',()=>{
  it('accepts a complete authoritative result and a cleared round',()=>{expect(parseRaceRound(results)).toEqual(results);expect(parseServerMessage({type:'race_round',roomId:'ABC123',state:results})?.type).toBe('race_round');expect(parseServerMessage({type:'race_round',roomId:'ABC123',state:null})).toEqual({type:'race_round',roomId:'ABC123',state:null});});
  it.each([
    {...results,round:-1},{...results,deadlineAt:99},{...results,deadlineAt:700001},{...results,totalCheckpoints:65},
    {...results,standings:[driver,driver]},{...results,standings:Array(13).fill(driver)},
    {...results,standings:[{...driver,finishMs:Infinity}]},{...results,standings:[{...driver,completedCheckpoints:2}]},
    {...results,standings:[{...driver,status:'racing',finishMs:null,completedCheckpoints:2}]},
    {...results,standings:[{...driver,status:'dnf',finishMs:null,reason:'fake',completedCheckpoints:2}]},
    {...results,standings:[{...driver,nickname:'x'.repeat(33)}]},
  ])('rejects malformed outcomes %#',value=>expect(parseRaceRound(value)).toBeNull());
  it('accepts a disconnected driver alongside a finisher',()=>{expect(parseRaceRound({...results,standings:[driver,{...driver,id:'b',status:'dnf',reason:'left',finishMs:null,completedCheckpoints:2}]})).not.toBeNull();});
  it('keeps generated server courses exactly aligned with every client map',()=>{
    expect(Object.keys(RACE_COURSES).sort()).toEqual(Object.keys(LEVEL_REGISTRY).sort());
    for(const level of Object.values(LEVEL_REGISTRY)){
      expect(RACE_COURSES[level.id].points).toEqual(level.data.track.points.map(point=>[point.x,point.z]));
      expect(RACE_COURSES[level.id].radius).toBe(Math.max(9.5,level.data.track.width+4.5)*.85);
    }
  });
});
