import {useEffect,useState} from 'react';
import {useGameStore} from '@/store/gameStore';
import {useDriveActivityStore} from '@/store/driveActivityStore';

const KEYBOARD_TIPS=['Hold Shift for boost','Tap Space while turning to slide','Press C to change your view','Double-tap R to recover at a checkpoint','Slow down before tight turns','Release steering to hold a slide · countersteer to straighten'];
const GAMEPAD_TIPS=['Hold L3 for boost','Tap X / Square while turning to slide','Press LB to change your view','Press Y / Triangle to recover','Slow down before tight turns','Center the stick to hold a slide · countersteer to straighten'];
const TOUCH_TIPS=['Hold NOS for boost','Tap the handbrake while turning to slide','Tap Camera to change your view','Tap Reset to return to a checkpoint','Slow down before tight turns','Release steering to hold a slide · steer opposite to straighten'];
let shownThisSession=false;

/** Brief controls appear one at a time, once per session; driving is never interrupted. */
export function DrivingTips({touch}:{touch:boolean}){
  const [step,setStep]=useState(()=>shownThisSession?KEYBOARD_TIPS.length:0);
  const activity=useDriveActivityStore(s=>s.activity);
  const controller=useGameStore(s=>s.gamepadConnected);
  useEffect(()=>{
    if(step>=KEYBOARD_TIPS.length){shownThisSession=true;return;}
    let remaining=6500,last=performance.now();
    const timer=window.setInterval(()=>{
      const now=performance.now(),elapsed=now-last;last=now;
      if(document.hidden||useGameStore.getState().gameState!=='playing'||activity!=='cruise')return;
      remaining-=elapsed;if(remaining<=0)setStep(value=>value+1);
    },250);
    const skip=(event:KeyboardEvent)=>{if(event.code==='KeyH'&&!event.repeat)setStep(KEYBOARD_TIPS.length);};
    const padSkip=()=>setStep(KEYBOARD_TIPS.length);
    window.addEventListener('keydown',skip);window.addEventListener('speedrunner-drive-guide',padSkip);
    return()=>{window.clearInterval(timer);window.removeEventListener('keydown',skip);window.removeEventListener('speedrunner-drive-guide',padSkip);};
  },[step,activity]);
  if(step>=KEYBOARD_TIPS.length||activity!=='cruise')return null;
  const tips=touch?TOUCH_TIPS:controller?GAMEPAD_TIPS:KEYBOARD_TIPS;
  return <aside className="driving-tip" role="status" aria-live="polite"><span>{tips[step]}</span><button aria-label="Dismiss driving tips" onClick={()=>{shownThisSession=true;setStep(KEYBOARD_TIPS.length);}}>×</button></aside>;
}
