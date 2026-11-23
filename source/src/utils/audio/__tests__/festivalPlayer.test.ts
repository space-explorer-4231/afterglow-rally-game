import {describe,expect,it,vi} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FESTIVAL_PLAYLIST} from '@/config/festivalPlaylist';
import {FestivalPlayer,type FestivalMedia} from '../festivalPlayer';
class Media implements FestivalMedia{
 src='';preload='';volume=1;currentTime=0;blocked=false;
 events=new Map<string,()=>void>();
 play=vi.fn(()=>this.blocked?Promise.reject(Error('autoplay')):Promise.resolve());pause=vi.fn();load=vi.fn();
 addEventListener=(type:'ended'|'error',listener:()=>void)=>{this.events.set(type,listener);};
 removeEventListener=(type:'ended'|'error')=>{this.events.delete(type);};
}
describe('festival soundtrack',()=>{
 it('ships the requested ten recordings in order, with verified local audio and credits',()=>{
  expect(FESTIVAL_PLAYLIST.map(t=>t.id)).toEqual(['on-and-on','cradles','royalty','mortals-slowed','why-we-lose','waiting','like-a-melody','fearless-slowed','shine-slowed','fight-in-me']);
  const manifest: {file:string;bytes:number;sha256:string}[]=JSON.parse(readFileSync('public/audio/festival/manifest.json','utf8'));
  for(const item of manifest){const file='public'+item.file;expect(statSync(file).size).toBe(item.bytes);expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(item.sha256);}
  expect(readFileSync('public/audio/festival/CREDITS.txt','utf8')).toContain('NoCopyrightSounds');
 });
 it('does not request soundtrack media before playback or while initially muted',async()=>{
  const media=new Media(),player=new FestivalPlayer(media,vi.fn());
  expect(media.preload).toBe('none');expect(media.src).toBe('');expect(media.load).not.toHaveBeenCalled();
  player.setVolume(0);player.unlock();expect(media.src).toBe('');expect(media.play).not.toHaveBeenCalled();
  player.setVolume(.3);await Promise.resolve();expect(media.src).toBe(FESTIVAL_PLAYLIST[0].file);expect(media.play).toHaveBeenCalledOnce();
  player.dispose();
 });
 it('waits for a gesture, plays every song, and wraps twice without shuffling',async()=>{
  const media=new Media(),notify=vi.fn(),player=new FestivalPlayer(media,notify);expect(media.play).not.toHaveBeenCalled();player.unlock();await Promise.resolve();
  for(let i=0;i<21;i++){expect(media.src).toBe(FESTIVAL_PLAYLIST[i%10].file);media.events.get('ended')?.();await Promise.resolve();}
  player.dispose();expect(media.events.size).toBe(0);expect(media.src).toBe('');
 });
 it('preserves position on mute/resume and sanitizes invalid volume',async()=>{
  const media=new Media(),player=new FestivalPlayer(media,vi.fn());player.unlock();await Promise.resolve();media.currentTime=87;
  player.setVolume(0);expect(media.pause).toHaveBeenCalled();player.setVolume(.3);await Promise.resolve();expect(media.currentTime).toBe(87);expect(media.volume).toBe(.3);
  player.setVolume(NaN);expect(media.volume).toBe(0);player.dispose();
 });
 it('exposes blocked playback and retries on the next gesture',async()=>{
  const media=new Media();media.blocked=true;const notify=vi.fn(),player=new FestivalPlayer(media,notify);player.unlock();await Promise.resolve();await Promise.resolve();expect(notify).toHaveBeenLastCalledWith(0,'blocked');
  media.blocked=false;player.unlock();await Promise.resolve();expect(notify).toHaveBeenLastCalledWith(0,'playing');player.dispose();
 });
 it('bounds missing-media recovery and ignores stale play promises after disposal',async()=>{
  const media=new Media();media.blocked=true;const notify=vi.fn(),player=new FestivalPlayer(media,notify);player.unlock();
  for(let i=0;i<10;i++)media.events.get('error')?.();expect(notify).toHaveBeenLastCalledWith(9,'unavailable');
  player.dispose();notify.mockClear();await Promise.resolve();await Promise.resolve();expect(notify).not.toHaveBeenCalled();
 });
});
