import {FESTIVAL_PLAYLIST} from '@/config/festivalPlaylist';

/** Minimal media surface keeps queue behavior testable without a browser. */
export interface FestivalMedia {
  src:string;preload:string;volume:number;currentTime:number;
  play:()=>Promise<void>;pause:()=>void;load:()=>void;
  addEventListener:(type:'ended'|'error',listener:()=>void)=>void;
  removeEventListener:(type:'ended'|'error',listener:()=>void)=>void;
}
export type FestivalPlayback='waiting'|'playing'|'paused'|'blocked'|'unavailable';
/** One streaming element, ordered queue, bounded recovery, and explicit listener cleanup. */
export class FestivalPlayer {
  private index=0;private unlocked=false;private disposed=false;private failures=0;private volume=.2;
  private generation=0;
  private readonly media:FestivalMedia;
  private readonly notify:(index:number,status:FestivalPlayback)=>void;
  constructor(media:FestivalMedia,notify:(index:number,status:FestivalPlayback)=>void){
    this.media=media;this.notify=notify;media.preload='none';
    media.addEventListener('ended',this.ended);media.addEventListener('error',this.error);notify(0,'waiting');
  }
  /** Must be called directly by a genuine pointer/keyboard/controller unlock. */
  unlock():void{if(this.disposed)return;this.unlocked=true;this.start();}
  /** Pause preserves position; resume does not reset the playlist. */
  setVolume(value:number):void{
    const previous=this.volume;this.volume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;this.media.volume=this.volume;
    if(this.volume===0){this.generation++;this.media.pause();this.notify(this.index,'paused');}
    else if(previous===0&&this.unlocked)this.start();
  }
  private start():void{
    if(this.disposed||!this.unlocked||this.volume<=0)return;
    // A muted session must not compete with the first playable scene for bandwidth.
    if(!this.media.src)this.media.src=FESTIVAL_PLAYLIST[this.index].file;
    const generation=++this.generation;this.media.volume=this.volume;
    void this.media.play().then(()=>{if(!this.disposed&&generation===this.generation){this.failures=0;this.notify(this.index,'playing');}})
      .catch(()=>{if(!this.disposed&&generation===this.generation)this.notify(this.index,'blocked');});
  }
  private ended=():void=>{if(this.disposed)return;this.failures=0;this.advance();};
  private error=():void=>{
    if(this.disposed)return;this.failures++;
    if(this.failures>=FESTIVAL_PLAYLIST.length){this.media.pause();this.notify(this.index,'unavailable');return;}
    this.advance();
  };
  private advance():void{
    this.generation++;this.index=(this.index+1)%FESTIVAL_PLAYLIST.length;
    this.media.src=FESTIVAL_PLAYLIST[this.index].file;this.media.currentTime=0;this.media.load();this.start();
  }
  /** Release media requests and callbacks when the app unmounts. */
  dispose():void{
    if(this.disposed)return;this.disposed=true;this.generation++;this.media.pause();
    this.media.removeEventListener('ended',this.ended);this.media.removeEventListener('error',this.error);
    this.media.src='';this.media.load();
  }
}
