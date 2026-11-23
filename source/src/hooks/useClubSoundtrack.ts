import {useEffect} from 'react';
import {FestivalPlayer} from '@/utils/audio/festivalPlayer';
import {useFestivalMusicStore} from '@/store/festivalMusicStore';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {sessionVolume} from '@/utils/quietSession';
import {useClubStore} from '@/store/clubStore';
import {getActiveGamepad} from '@/utils/input/gamepad';

/** Attempts autoplay, with a gesture retry when blocked. Continuous playback across menus, pause and background; saved volume remains authoritative. */
export function useClubSoundtrack():void {
  useEffect(()=>{
    const player=new FestivalPlayer(new Audio(),useFestivalMusicStore.getState().setTrack);
    let unlocked=false;
    const update=()=>{
      const game=useGameStore.getState(),settings=useSettingsStore.getState();
      const driving=game.gameState==='playing';
      if(driving)useClubStore.getState().discover(game.speed,game.nitroActive);
      const volume=sessionVolume(driving||game.gameState==='paused'?settings.gameMusicVolume:settings.menuMusicVolume);
      player.setVolume(volume);
    };
    const start=()=>{
      update();if(!unlocked||useFestivalMusicStore.getState().status==='blocked'){unlocked=true;player.unlock();}
    };
    window.addEventListener('pointerdown',start,true);window.addEventListener('keydown',start,true);
    window.addEventListener('aeroline-audio-ready',start);
    const controller=window.setInterval(()=>{if((!unlocked||useFestivalMusicStore.getState().status==='blocked')&&getActiveGamepad()?.buttons.some(button=>button.pressed))start();update();},200);
    document.addEventListener('visibilitychange',update);
    start();
    return()=>{window.clearInterval(controller);window.removeEventListener('pointerdown',start,true);window.removeEventListener('keydown',start,true);window.removeEventListener('aeroline-audio-ready',start);document.removeEventListener('visibilitychange',update);player.dispose();};
  },[]);
}
