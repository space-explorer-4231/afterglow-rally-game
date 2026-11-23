import {describe,it,expect} from 'vitest';
import {CLUB_BPM,clubNote,clubIntensity} from '../clubScore';
import {foundNightFrequency,useClubStore} from '@/store/clubStore';
describe('original Club Radio composition and driving dynamics',()=>{
  it('uses four distinct harmonic sections and closes the complete phrase',()=>{
    expect([0,32,64,96].map(step=>clubNote(step).bass)).toEqual([45,41,48,43]);
    expect(clubNote(128)).toEqual(clubNote(0));expect(CLUB_BPM).toBe(112);
  });
  it('keeps all notes within the playable range over a twenty-minute session',()=>{
    const steps=Math.ceil(20*60/(60/CLUB_BPM/4));
    for(let step=0;step<steps;step++)for(const midi of [clubNote(step%128).bass,clubNote(step%128).lead,...clubNote(step%128).chord]){
      expect(Number.isFinite(midi)).toBe(true);expect(midi).toBeGreaterThanOrEqual(24);expect(midi).toBeLessThanOrEqual(90);
    }
  });
  it('keeps a steady backbeat while NOS raises the driving mix smoothly',()=>{
    expect(clubNote(0).kick).toBe(true);expect(clubNote(4).snare).toBe(true);expect(clubNote(2).snare).toBe(false);
    expect(clubIntensity(0,false)).toBe(0);expect(clubIntensity(90,false)).toBe(.5);
    expect(clubIntensity(90,true)).toBe(.8);expect(clubIntensity(300,true)).toBe(1);
  });
  it('sanitizes malformed speed and clamps the audio intensity',()=>{
    expect(clubIntensity(NaN,false)).toBe(0);expect(clubIntensity(Infinity,true)).toBe(.3);
    expect(clubIntensity(-90,false)).toBe(.5);
  });
  it('discovers the local 88 club once, without touching shared race scores',()=>{
    useClubStore.setState({nightFrequency:false});
    expect(foundNightFrequency(87,true)).toBe(false);expect(foundNightFrequency(88,false)).toBe(false);
    expect(foundNightFrequency(Infinity,true)).toBe(false);
    useClubStore.getState().discover(88,true);expect(useClubStore.getState().nightFrequency).toBe(true);
    useClubStore.getState().discover(0,false);expect(useClubStore.getState().nightFrequency).toBe(true);
    useClubStore.setState({nightFrequency:false});
  });
});
