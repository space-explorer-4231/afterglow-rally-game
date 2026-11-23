import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {RaceRound} from '../RaceRound.js';
const course={radius:8,points:[[0,0],[50,0],[50,50],[0,50]] as const};
const racers=[{id:'a',nickname:'Driver A',vehicleId:'stradale_gt'},{id:'b',nickname:'Driver B',vehicleId:'bmw_m3_drift'}];
let race:RaceRound;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(100000);race=new RaceRound(1,103000,course,racers,vi.fn());});
afterEach(()=>{race.destroy();vi.useRealTimers();});
function gate(id:string,index:number){vi.advanceTimersByTime(1000);const point=course.points[index];race.position(id,point[0],point[1]);}
function finish(id:string){for(const index of [1,2,3,0])gate(id,index);}
describe('shared one-lap results and clock authority',()=>{
  it('does not credit gates before the server GO epoch',()=>{race.position('a',50,0);expect(race.snapshot().standings[0].completedCheckpoints).toBe(0);});
  it('ignores spectators and unknown sessions',()=>{vi.advanceTimersByTime(3000);finish('outsider');expect(race.snapshot().standings.every(row=>row.completedCheckpoints===0)).toBe(true);});
  it('requires gates in order and ignores duplicate visits',()=>{vi.advanceTimersByTime(3000);gate('a',3);expect(race.snapshot().standings[0].completedCheckpoints).toBe(0);gate('a',1);gate('a',1);expect(race.snapshot().standings[0].completedCheckpoints).toBe(1);});
  it('uses server elapsed time and grants thirty seconds after the first finish',()=>{
    vi.advanceTimersByTime(3000);finish('a');const state=race.snapshot();expect(state.standings[0].finishMs).toBe(4000);expect(state.deadlineAt).toBe(Date.now()+30000);expect(state.phase).toBe('racing');
  });
  it('publishes the same ordered results as soon as everybody finishes',()=>{vi.advanceTimersByTime(3000);finish('b');finish('a');const state=race.snapshot();expect(state.phase).toBe('results');expect(state.standings.map(row=>row.id)).toEqual(['b','a']);expect(state.standings[1].finishMs).toBe(8000);});
  it('breaks equal-millisecond finishes by arrival order rather than join order',()=>{
    vi.advanceTimersByTime(3000);
    for(const index of [1,2,3,0]){vi.advanceTimersByTime(1000);const point=course.points[index];race.position('b',point[0],point[1]);race.position('a',point[0],point[1]);}
    const standings=race.snapshot().standings;expect(standings[0].finishMs).toBe(standings[1].finishMs);expect(standings.map(driver=>driver.id)).toEqual(['b','a']);
  });
  it('marks unfinished drivers DNF after the finish grace',()=>{vi.advanceTimersByTime(3000);finish('a');vi.advanceTimersByTime(30000);expect(race.snapshot().phase).toBe('results');expect(race.snapshot().standings[1].reason).toBe('timeout');});
  it('times out a stalled round after ten minutes without a winner',()=>{vi.advanceTimersByTime(603000);expect(race.snapshot().phase).toBe('results');expect(race.snapshot().standings.every(row=>row.reason==='timeout')).toBe(true);});
  it('preserves a finisher and identifies a departed opponent',()=>{vi.advanceTimersByTime(3000);finish('a');race.leave('a');race.leave('b');expect(race.snapshot().phase).toBe('results');expect(race.snapshot().standings[0].status).toBe('finished');expect(race.snapshot().standings[1].reason).toBe('left');});
  it('detects a recovery jump without allowing it to hit the finish gate',()=>{race.position('a',0,0);vi.advanceTimersByTime(3100);race.position('a',500,500);expect(race.snapshot().standings.find(row=>row.id==='a')?.reason).toBe('teleport');});
  it('does not broadcast or rank repeated finish packets twice',()=>{vi.advanceTimersByTime(3000);finish('a');const first=race.snapshot().standings[0].finishMs;for(let i=0;i<20;i++)race.position('a',0,0);expect(race.snapshot().standings[0].finishMs).toBe(first);});
  it('rejects nonfinite positions without damaging progress',()=>{vi.advanceTimersByTime(3000);race.position('a',NaN,0);race.position('a',0,Infinity);gate('a',1);expect(race.snapshot().standings[0].completedCheckpoints).toBe(1);});
  it('cancels its timeout when a room resets or closes',()=>{const timers=vi.getTimerCount();race.destroy();expect(vi.getTimerCount()).toBe(timers-1);vi.advanceTimersByTime(700000);expect(race.snapshot().phase).toBe('racing');});
});
