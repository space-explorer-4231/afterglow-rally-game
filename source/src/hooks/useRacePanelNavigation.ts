import {useEffect,type RefObject} from 'react';
import {getActiveGamepad,isButtonPressed} from '@/utils/input/gamepad';
import {isTextEditingActive} from '@/utils/input/textInput';
import {useGameStore} from '@/store/gameStore';

/** Independent HUD controls avoid consuming the driving input sampler's button edges. */
export function useRacePanelNavigation(panel:RefObject<HTMLElement|null>,enabled:boolean):void {
  useEffect(()=>{
    if(!enabled)return;
    let previousDirection=0,previousConfirm=isButtonPressed(getActiveGamepad()?.buttons[0]);
    let previousPause=isButtonPressed(getActiveGamepad()?.buttons[9])||isButtonPressed(getActiveGamepad()?.buttons[1]);
    const navigate=(direction:number,confirm:boolean)=>{
      const element=panel.current;if(!element)return;
      const focused=document.activeElement;
      if(focused instanceof HTMLElement&&!element.contains(focused)&&focused.closest('button,a,[role="button"]'))return;
      const controls=Array.from(element.querySelectorAll<HTMLElement>('[data-race-control]:not(:disabled)')).filter(control=>control.getClientRects().length>0);
      if(!controls.length)return;
      let index=-1;for(let i=0;i<controls.length;i++)if(document.activeElement===controls[i])index=i;
      if(index<0)index=direction<0?controls.length-1:0;
      else if(direction)index=(index+direction+controls.length)%controls.length;
      controls[index].focus();if(confirm)controls[index].click();
    };
    const keyboard=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||isTextEditingActive(event)||event.repeat)return;
      const direction=event.code==='ArrowDown'||event.code==='ArrowRight'?1:event.code==='ArrowUp'||event.code==='ArrowLeft'?-1:0;
      if(direction){event.preventDefault();navigate(direction,false);}
      else if(event.code==='Enter'&&!panel.current?.contains(document.activeElement)){event.preventDefault();navigate(0,true);}
    };
    const timer=window.setInterval(()=>{
      const pad=getActiveGamepad();if(!pad){previousDirection=0;previousConfirm=false;return;}
      const direction=isButtonPressed(pad.buttons[13])||isButtonPressed(pad.buttons[15])?1:isButtonPressed(pad.buttons[12])||isButtonPressed(pad.buttons[14])?-1:0;
      const confirm=isButtonPressed(pad.buttons[0]);
      const pause=isButtonPressed(pad.buttons[9])||isButtonPressed(pad.buttons[1]);
      if(pause&&!previousPause)useGameStore.getState().setGameState('paused');
      if(direction&&direction!==previousDirection)navigate(direction,false);
      if(confirm&&!previousConfirm)navigate(0,true);
      previousDirection=direction;previousConfirm=confirm;previousPause=pause;
    },80);
    window.addEventListener('keydown',keyboard);
    return()=>{window.clearInterval(timer);window.removeEventListener('keydown',keyboard);};
  },[panel,enabled]);
}
