import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {useClubSoundtrack} from '../useClubSoundtrack';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useFestivalMusicStore} from '@/store/festivalMusicStore';
import type {FestivalMedia} from '@/utils/audio/festivalPlayer';
const lifecycle=vi.hoisted(()=>({dispose:undefined as (()=>void)|undefined}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(effect:()=>void|(()=>void))=>{lifecycle.dispose=effect()||undefined;}}));
vi.mock('@/utils/input/gamepad',()=>({getActiveGamepad:()=>null}));
let tick:()=>void;
const target=new EventTarget(),documentTarget=new EventTarget();
const documentState={hidden:false,addEventListener:documentTarget.addEventListener.bind(documentTarget),removeEventListener:documentTarget.removeEventListener.bind(documentTarget)};
class Media implements FestivalMedia {
 static instances:Media[]=[];
 src='';preload='';volume=1;currentTime=0;blocked=false;events=new Map<string,()=>void>();
 constructor(){Media.instances.push(this);}
 play=vi.fn(()=>this.blocked?Promise.reject(Error('autoplay')):Promise.resolve());pause=vi.fn();load=vi.fn();
 addEventListener=(type:'ended'|'error',listener:()=>void)=>{this.events.set(type,listener);};
 removeEventListener=(type:'ended'|'error')=>{this.events.delete(type);};
}
beforeEach(()=>{
 Media.instances.length=0;vi.stubGlobal('Audio',Media);vi.stubGlobal('window',{location:{search:''},addEventListener:target.addEventListener.bind(target),removeEventListener:target.removeEventListener.bind(target),setInterval:(callback:()=>void)=>{tick=callback;return 1;},clearInterval:vi.fn()});
 documentState.hidden=false;vi.stubGlobal('document',documentState);
 useGameStore.setState({gameState:'menu',speed:0,nitroActive:false});useSettingsStore.setState({menuMusicVolume:.3,gameMusicVolume:.6});
});
afterEach(()=>{lifecycle.dispose?.();lifecycle.dispose=undefined;vi.unstubAllGlobals();});
it('attempts music on load and keeps the same recording/time through loading, pause and background',async()=>{
 useClubSoundtrack();const media=Media.instances[0];await Promise.resolve();expect(media.play).toHaveBeenCalledOnce();const src=media.src;media.currentTime=47;
 for(const state of ['loading','playing','paused','menu'] as const){useGameStore.setState({gameState:state});documentState.hidden=true;tick();documentTarget.dispatchEvent(new Event('visibilitychange'));expect(media.volume).toBe(state==='playing'||state==='paused'?.6:.3);expect(media.src).toBe(src);expect(media.currentTime).toBe(47);}
 expect(media.pause).not.toHaveBeenCalled();
});
it('obeys settings mute and resumes at the same playback position',async()=>{
 useClubSoundtrack();const media=Media.instances[0];await Promise.resolve();media.currentTime=31;useSettingsStore.setState({menuMusicVolume:0});tick();expect(media.volume).toBe(0);expect(media.pause).toHaveBeenCalled();
 useSettingsStore.setState({menuMusicVolume:.4});tick();await Promise.resolve();expect(media.play).toHaveBeenCalledTimes(2);expect(media.currentTime).toBe(31);
});
it('retries a browser-blocked start on the next real gesture and disposes all media callbacks',async()=>{
 class BlockedMedia extends Media {constructor(){super();this.blocked=true;}}
 vi.stubGlobal('Audio',BlockedMedia);useClubSoundtrack();const media=Media.instances[0];await Promise.resolve();await Promise.resolve();expect(useFestivalMusicStore.getState().status).toBe('blocked');
 media.blocked=false;target.dispatchEvent(new Event('pointerdown'));await Promise.resolve();expect(useFestivalMusicStore.getState().status).toBe('playing');
 lifecycle.dispose?.();lifecycle.dispose=undefined;expect(media.events.size).toBe(0);const calls=media.play.mock.calls.length;target.dispatchEvent(new Event('pointerdown'));expect(media.play).toHaveBeenCalledTimes(calls);
});
