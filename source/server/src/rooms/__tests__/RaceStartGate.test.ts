import {beforeEach, afterEach, describe, it, expect, vi} from 'vitest';
import {RaceStartGate} from '../RaceStartGate.js';

describe('Shared starting grid and majority ballots', () => {
  let gate: RaceStartGate;
  beforeEach(() => {vi.useFakeTimers(); gate = new RaceStartGate(vi.fn());});
  afterEach(() => {gate.destroy(); vi.useRealTimers();});
  function joinReady(count: number) {
    for (let i = 0; i < count; i++) {gate.join(`p${i}`); gate.ready(`p${i}`);}
  }
  it('never starts automatically when players join or become ready', () => {
    joinReady(12); vi.advanceTimersByTime(30000);
    expect(gate.snapshot().phase).toBe('waiting');
  });
  it('requires every client to have loaded, then starts on one shared epoch', () => {
    gate.join('host'); gate.ready('host'); gate.join('guest');
    expect(gate.start()).toBe(false);
    gate.ready('guest'); expect(gate.start()).toBe(true);
    const startAt = gate.snapshot().startAt;
    expect(startAt).toBe(Date.now() + 3000);
    vi.advanceTimersByTime(2999); expect(gate.snapshot().phase).toBe('countdown');
    vi.advanceTimersByTime(1); expect(gate.snapshot().phase).toBe('racing');
    expect(gate.snapshot().startAt).toBe(startAt);
  });
  it('allows host practice with one ready player, but no voting at one or two', () => {
    joinReady(2); expect(gate.vote('p0',true)).toBe(false);
    expect(gate.vote('p1',true)).toBe(false); expect(gate.snapshot().votedIds).toEqual([]);
    gate.leave('p1'); expect(gate.start()).toBe(true);
  });
  for (let count = 3; count <= 12; count++) it(`requires a strict majority of ${count} players`, () => {
    joinReady(count); const required = Math.floor(count / 2) + 1;
    for (let i = 0; i < required - 1; i++) gate.vote(`p${i}`,true);
    expect(gate.snapshot().phase).toBe('waiting');
    gate.vote(`p${required - 1}`,true);
    expect(gate.snapshot().phase).toBe('countdown');
    expect(gate.snapshot().racerIds).toHaveLength(count);
  });
  it('deduplicates votes, permits withdrawal, ignores unknown and loading voters', () => {
    joinReady(3); gate.join('loading');
    expect(gate.vote('outsider',true)).toBe(false); expect(gate.vote('loading',true)).toBe(false);
    for(let i=0;i<1000;i++) gate.vote('p0',true);
    expect(gate.snapshot().votedIds).toEqual(['p0']);
    gate.vote('p0',false); expect(gate.snapshot().votedIds).toEqual([]);
  });
  it('holds a pending majority until the last client finishes loading', () => {
    joinReady(2); gate.join('p2'); gate.vote('p0',true); gate.vote('p1',true);
    expect(gate.snapshot().phase).toBe('waiting'); gate.ready('p2');
    expect(gate.snapshot().phase).toBe('countdown');
  });
  it('closes voting and revokes ballots when population drops below three', () => {
    joinReady(3); gate.vote('p0',true); gate.leave('p2');
    expect(gate.snapshot().votedIds).toEqual([]); expect(gate.snapshot().phase).toBe('waiting');
    gate.join('p3'); gate.ready('p3'); expect(gate.snapshot().votedIds).toEqual([]);
  });
  it('recalculates majority on disconnect without counting departed votes', () => {
    joinReady(4); gate.vote('p0',true); gate.vote('p1',true); gate.leave('p3');
    expect(gate.snapshot().phase).toBe('countdown');
    gate.reset(); gate.vote('p0',true); gate.leave('p0');
    expect(gate.snapshot().votedIds).toEqual([]);
  });
  it('late joins stay outside the cohort, then join the next grid', () => {
    joinReady(2); gate.start(); gate.join('late'); gate.ready('late');
    expect(gate.snapshot().racerIds).toEqual(['p0','p1']);
    vi.advanceTimersByTime(3000); expect(gate.snapshot().racerIds).not.toContain('late');
    gate.reset(); expect(gate.snapshot().phase).toBe('waiting'); expect(gate.snapshot().round).toBe(2);
    gate.start(); expect(gate.snapshot().racerIds).toContain('late');
  });
  it('cancels timers on reset, destroy and loss of the entire racing cohort', () => {
    joinReady(2); gate.start(); gate.reset(); vi.advanceTimersByTime(5000);
    expect(gate.snapshot().phase).toBe('waiting'); gate.start(); gate.join('late');
    gate.leave('p0'); gate.leave('p1'); vi.advanceTimersByTime(5000);
    expect(gate.snapshot().phase).toBe('waiting');
    gate.ready('late'); gate.start(); gate.destroy(); vi.advanceTimersByTime(5000);
    expect(gate.snapshot().phase).toBe('countdown');
  });
});

describe('Automatic same-room rematches',()=>{
 let gate:RaceStartGate;
 beforeEach(()=>{vi.useFakeTimers();gate=new RaceStartGate(vi.fn(),true);gate.join('host');gate.ready('host');gate.join('friend');gate.ready('friend');gate.start();vi.advanceTimersByTime(3000);});
 afterEach(()=>{gate.destroy();vi.useRealTimers();});
 it('shows results for ten seconds then starts a new shared countdown without host input',()=>{
  gate.complete();vi.advanceTimersByTime(9999);expect(gate.snapshot().phase).toBe('results');
  vi.advanceTimersByTime(1);expect(gate.snapshot()).toMatchObject({phase:'countdown',round:2,startAt:Date.now()+3000});
  vi.advanceTimersByTime(3000);expect(gate.snapshot().phase).toBe('racing');gate.complete();vi.advanceTimersByTime(10000);expect(gate.snapshot().round).toBe(3);
 });
 it('waits for a late arrival to finish loading before the automatic rematch',()=>{
  gate.join('late');gate.complete();vi.advanceTimersByTime(10000);expect(gate.snapshot().phase).toBe('waiting');
  gate.ready('late');expect(gate.snapshot().phase).toBe('countdown');expect(gate.snapshot().racerIds).toContain('late');
 });
 it('does not let an unready departure block the next race',()=>{
  gate.join('late');gate.complete();vi.advanceTimersByTime(10000);gate.leave('late');expect(gate.snapshot().phase).toBe('countdown');
 });
 it('a manual reset cancels the pending automatic start',()=>{
  gate.complete();gate.reset();vi.advanceTimersByTime(20000);expect(gate.snapshot().phase).toBe('waiting');expect(gate.snapshot().round).toBe(2);
 });
 it('room cleanup cancels automatic timers',()=>{
  gate.complete();gate.destroy();vi.advanceTimersByTime(20000);expect(gate.snapshot().phase).toBe('results');
 });
});
